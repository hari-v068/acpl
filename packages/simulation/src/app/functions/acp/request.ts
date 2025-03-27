import { gameHelper } from '@/lib/helpers/game.helper';
import {
  chatQueries,
  jobItemQueries,
  jobQueries,
  messageQueries,
} from '@acpl/db/queries';
import { GameFunction } from '@virtuals-protocol/game';
import { z } from 'zod';

const RequestArgsSchema = z.object({
  providerId: z.string().min(1, 'Provider ID is required'),
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
  hint: 'Use this function to create a new job request. You need to specify the provider, item, quantity, and price per unit.',
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
      itemName,
      quantity,
      pricePerUnit,
      message,
      requirements,
    } = parseResult.data;

    // Check if requesting from self
    if (providerId === clientId) {
      return gameHelper.function.response.failed(
        'Cannot request service from yourself',
      );
    }

    try {
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
      ].some((job) => job.phase !== 'COMPLETE' && job.phase !== 'REJECTED');

      if (hasActiveJob) {
        return gameHelper.function.response.failed(
          'There is already an active job between you and this agent.',
        );
      }

      // Start with creating the job
      const jobId = `job-${clientId}-${Date.now()}`;
      const job = await jobQueries.create({
        id: jobId,
        clientId,
        providerId,
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
