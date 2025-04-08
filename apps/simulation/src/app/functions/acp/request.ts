import { gameHelper } from '@/lib/helpers/game.helper';
import {
  chatQueries,
  jobItemQueries,
  jobQueries,
  messageQueries,
  providerQueries,
  agentQueries,
} from '@acpl/db/queries';
import { JobPhases } from '@acpl/types';
import { GameFunction } from '@virtuals-protocol/game';
import { z } from 'zod';

const RequestArgsSchema = z.object({
  providerId: z.string().min(1, 'Provider ID is required'),
  evaluatorId: z
    .string()
    .min(1, 'Evaluator ID is required (use "NONE" if no evaluator desired)'),
  itemName: z.string().min(1, 'Item name is required'),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
  pricePerUnit: z.coerce
    .number()
    .positive('Price must be greater than 0')
    .max(999999999.99, 'Price exceeds maximum allowed value')
    .transform((num) => num.toFixed(2)),
  message: z.string().min(1, 'Message is required'),
  requirements: z.string().min(1, 'Service requirements are required'),
});

type RequestArgs = z.infer<typeof RequestArgsSchema>;

export const request = new GameFunction({
  name: 'request',
  description: 'Request a service from a provider',
  hint: `
    Use this function to initiate a new service request or purchase. The process involves:

    YOUR ROLE AS CLIENT:
    - Specify what you want to buy (must be in provider's catalog)
    - Set initial terms (quantity, price, requirements)
    - Choose whether to involve an evaluator (recommended)
    - Cannot request from yourself or have active jobs with same provider

    PROVIDER'S ROLE:
    - Will review your request and requirements
    - Must accept before proceeding to negotiation
    - Can reject if unable to fulfill requirements

    EVALUATOR'S ROLE (if specified):
    - Will review if they can properly evaluate the item/service
    - Must accept before proceeding to negotiation
    - Can reject if unable to assess properly
    - Recommended for:
      * Quality assurance of delivered items
      * Independent verification of requirements
      * Protection against unsatisfactory deliveries
      * Professional assessment of complex items

    PROCESS FLOW:
    1. Your request creates a new job in REQUEST phase
    2. Both provider and evaluator (if specified) must respond
    3. Job moves to NEGOTIATION only after all parties accept
    4. If either party rejects, job moves to REJECTED phase

    Note: Specify "NONE" for evaluatorId only for simple, low-risk transactions
  `,
  args: [
    {
      name: 'providerId',
      description: 'ID of the provider agent',
      type: 'string',
    },
    {
      name: 'itemName',
      description: 'Name of the item/service to request',
      type: 'string',
    },
    {
      name: 'quantity',
      description: 'Quantity of items to request',
      type: 'number',
    },
    {
      name: 'pricePerUnit',
      description: 'Price per unit offered',
      type: 'string',
    },
    {
      name: 'requirements',
      description: 'Specific requirements for the service/item',
      type: 'string',
    },
    {
      name: 'message',
      description: 'Message to send to the provider',
      type: 'string',
    },
    {
      name: 'evaluatorId',
      description:
        'ID of the evaluator agent (use "NONE" if no evaluator desired, although it is recommended to use an evaluator for better transaction security)',
      type: 'string',
    },
  ] as const,
  executable: async (args, _logger) => {
    const clientId = gameHelper.function.who(args);

    // Validate args using Zod
    const parseResult = RequestArgsSchema.safeParse(args);
    if (!parseResult.success) {
      return gameHelper.function.response.failed(
        parseResult.error.issues[0].message,
      );
    }

    const {
      providerId,
      evaluatorId,
      itemName,
      quantity,
      pricePerUnit,
      message,
      requirements,
    } = parseResult.data;

    try {
      // Validate evaluator if provided and not "NONE"
      if (evaluatorId && evaluatorId !== 'NONE') {
        const evaluator = await agentQueries.getById(evaluatorId);
        if (!evaluator) {
          return gameHelper.function.response.failed('Evaluator not found');
        }
      }

      // Check if requesting from self
      if (providerId === clientId) {
        return gameHelper.function.response.failed(
          'Cannot request service from yourself.',
        );
      }

      // Check if trying to request from evaluator
      if (providerId === 'agent-evaluator') {
        return gameHelper.function.response.failed(
          'Cannot request services directly from the evaluator. Evaluators can only be assigned to evaluate jobs.',
        );
      }

      // Check if provider exists in providers table
      const provider = await providerQueries.getByAgentId(providerId);
      if (!provider) {
        return gameHelper.function.response.failed(
          'The specified provider does not exist.',
        );
      }

      // Disallow selling items using this function
      const client = await providerQueries.getByAgentId(clientId);

      const isItemInClientCatalog = client?.catalog.some(
        (item) => item.product === itemName,
      );
      const isItemInProviderCatalog = provider.catalog.some(
        (item) => item.product === itemName,
      );

      if (isItemInClientCatalog && !isItemInProviderCatalog) {
        return gameHelper.function.response.failed(
          'You cannot use this function to sell items. This function is intended for requesting to buy items, not to sell them.',
        );
      }

      // Check if the provider is selling the requested item
      if (!isItemInProviderCatalog) {
        return gameHelper.function.response.failed(
          'The provider does not sell the requested item.',
        );
      }

      // Check for existing active jobs between the client and provider in both directions
      const activeJobsAsClient = await jobQueries.getActiveJobsBetweenAgents(
        clientId,
        providerId,
      );
      const activeJobsAsProvider = await jobQueries.getActiveJobsBetweenAgents(
        providerId,
        clientId,
      );

      const hasActiveJob = [
        ...activeJobsAsClient,
        ...activeJobsAsProvider,
      ].some(
        (job) =>
          job.phase !== JobPhases.Enum.COMPLETE &&
          job.phase !== JobPhases.Enum.REJECTED,
      );

      if (hasActiveJob) {
        return gameHelper.function.response.failed(
          'There is already an active job between you and this agent. Either complete the job or reject it before requesting a new one.',
        );
      }

      // Start with creating the job
      const jobId = `job-${clientId}-${Date.now()}`;
      const job = await jobQueries.create({
        id: jobId,
        clientId,
        providerId,
        evaluatorId: evaluatorId === 'NONE' ? null : evaluatorId,
        phase: 'REQUEST',
      });

      // Create the job item
      const jobItemId = `job-item-${jobId}`;
      await jobItemQueries.create({
        id: jobItemId,
        jobId: job.id as string,
        itemName,
        quantity,
        pricePerUnit,
        requirements,
      });

      // Create a chat for the job
      const chatId = `chat-${jobId}`;
      await chatQueries.create({
        id: chatId,
        jobId: job.id as string,
        clientId,
        providerId,
        evaluatorId: evaluatorId === 'NONE' ? null : evaluatorId,
      });

      const messageId = `message-${chatId}-${Date.now()}`;
      await messageQueries.create({
        id: messageId,
        chatId,
        authorId: clientId,
        message,
      });

      return gameHelper.function.response.success(
        'Service request created successfully',
        {
          jobId,
          chatId,
          terms: {
            itemName,
            quantity,
            pricePerUnit,
            requirements,
          },
        },
      );
    } catch (e) {
      return gameHelper.function.response.failed(
        `Failed to create service request - ${e}`,
      );
    }
  },
});
