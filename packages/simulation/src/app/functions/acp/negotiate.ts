import { gameHelper } from '@/lib/helpers/game.helper';
import { serviceHelper } from '@/lib/helpers/service.helper';
import {
  chatQueries,
  jobItemQueries,
  jobQueries,
  messageQueries,
} from '@acpl/db/queries';
import { JobPhases } from '@acpl/types';
import { GameFunction } from '@virtuals-protocol/game';
import { z } from 'zod';

const NegotiationIntentionEnum = z.enum([
  'COUNTER',
  'AGREE',
  'DISAGREE',
  'CANCEL',
  'GENERAL',
]);

const ProposedTermsSchema = z
  .object({
    quantity: z.number().int().positive().optional(),
    pricePerUnit: z.coerce
      .number()
      .positive('Price must be greater than 0')
      .max(999999999.99, 'Price exceeds maximum allowed value')
      .transform((num) => num.toFixed(2))
      .optional(),
    requirements: z.string().min(1).optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    'At least one term must be provided for counter-offer',
  );

const NegotiateArgsSchema = z
  .object({
    jobId: z.string().min(1, 'Job ID is required'),
    message: z.string().min(1, 'Message is required'),
    intention: NegotiationIntentionEnum,
    proposedTerms: z.union([ProposedTermsSchema, z.undefined()]),
  })
  .refine(
    (data) => {
      if (data.intention === 'COUNTER') {
        return data.proposedTerms !== undefined;
      }
      if (data.intention === 'AGREE') {
        return data.proposedTerms !== undefined;
      }
      return true;
    },
    { message: 'Terms are required for COUNTER and AGREE intentions' },
  );

type NegotiationIntention = z.infer<typeof NegotiationIntentionEnum>;
type NegotiateArgs = z.infer<typeof NegotiateArgsSchema>;

export const negotiate = new GameFunction({
  name: 'negotiate',
  description: 'Send a message during job negotiation',
  hint: 'Use this to discuss terms, make counter-offers, or agree to current terms during NEGOTIATION phase.',
  args: [
    {
      name: 'jobId',
      type: 'string',
      description: 'The ID of the job being negotiated',
    },
    {
      name: 'intention',
      type: 'string',
      description: `Your intention for this negotiation (${NegotiationIntentionEnum.options.join(
        ', ',
      )})`,
    },
    {
      name: 'quantity',
      type: 'number',
      description: 'New quantity being proposed (for COUNTER intention)',
      optional: true,
    },
    {
      name: 'pricePerUnit',
      type: 'string',
      description: 'New price per unit being proposed (for COUNTER intention)',
      optional: true,
    },
    {
      name: 'requirements',
      type: 'string',
      description: 'New requirements being proposed (for COUNTER intention)',
      optional: true,
    },
    {
      name: 'message',
      type: 'string',
      description: 'Your negotiation message',
    },
  ] as const,
  executable: async (args, _logger) => {
    const agentId = gameHelper.function.who(args);

    let termsToPropose;
    if (args.intention === 'COUNTER') {
      termsToPropose = {
        quantity: args.quantity,
        pricePerUnit: args.pricePerUnit,
        requirements: args.requirements,
      };
    }

    const parseResult = NegotiateArgsSchema.safeParse({
      jobId: args.jobId,
      message: args.message,
      intention: args.intention,
      proposedTerms: termsToPropose,
    });
    if (!parseResult.success) {
      return gameHelper.function.response.failed(
        parseResult.error.issues[0].message,
      );
    }

    const { jobId, message, intention, proposedTerms } = parseResult.data;

    try {
      // Get job details first
      const job = await jobQueries.getById(jobId);
      if (!job) {
        return gameHelper.function.response.failed('Job not found');
      }

      // Verify agent is involved in the job
      if (job.providerId !== agentId && job.clientId !== agentId) {
        return gameHelper.function.response.failed(
          'Not authorized to negotiate this job',
        );
      }

      // Must be in NEGOTIATION phase
      if (job.phase !== 'NEGOTIATION') {
        return gameHelper.function.response.failed(
          `Cannot negotiate in ${job.phase} phase`,
        );
      }

      // Get job item details
      const jobItem = await jobItemQueries.getByJobId(jobId);
      if (!jobItem) {
        return gameHelper.function.response.failed('Job item not found');
      }

      // Get chat to check messages
      const chat = await chatQueries.getByJobId(jobId);
      if (!chat) {
        return gameHelper.function.response.failed('Chat not found');
      }

      const hasUnreadMessages = serviceHelper.chat.hasUnreadMessages(
        chat,
        agentId,
      );
      if (hasUnreadMessages) {
        return gameHelper.function.response.failed(
          'You must read all messages before taking this action. Use the read function first.',
        );
      }

      // Check if counter-offer has the same terms as current job item
      if (intention === 'COUNTER' && proposedTerms) {
        const hasSameTerms =
          (proposedTerms.quantity === undefined ||
            proposedTerms.quantity === jobItem.quantity) &&
          (proposedTerms.pricePerUnit === undefined ||
            proposedTerms.pricePerUnit === jobItem.pricePerUnit) &&
          (proposedTerms.requirements === undefined ||
            proposedTerms.requirements === jobItem.requirements);

        if (hasSameTerms) {
          return gameHelper.function.response.failed(
            'Cannot make a counter-offer with the same terms. Please wait for the other party to respond or propose different terms.',
          );
        }
      }

      // Handle the intention
      switch (intention) {
        case 'CANCEL':
          await jobQueries.updatePhase(jobId, JobPhases.Enum.REJECTED);
          // Send cancellation message
          const cancelMessageId = `message-${chat.id}-${Date.now()}`;
          await messageQueries.create({
            id: cancelMessageId,
            chatId: chat.id,
            authorId: agentId,
            message,
          });
          return gameHelper.function.response.success('Negotiation cancelled', {
            nextPhase: JobPhases.Enum.REJECTED,
          });

        case 'COUNTER':
          await jobItemQueries.update(jobItem.id, {
            quantity: proposedTerms?.quantity,
            pricePerUnit: proposedTerms?.pricePerUnit,
            requirements: proposedTerms?.requirements,
          });
          // Send counter-offer message
          const counterMessageId = `message-${chat.id}-${Date.now()}`;
          await messageQueries.create({
            id: counterMessageId,
            chatId: chat.id,
            authorId: agentId,
            message,
          });
          return gameHelper.function.response.success(
            'Counter-offer proposed',
            {
              newTerms: {
                quantity: proposedTerms?.quantity ?? jobItem.quantity,
                pricePerUnit:
                  proposedTerms?.pricePerUnit ?? jobItem.pricePerUnit,
                requirements:
                  proposedTerms?.requirements ?? jobItem.requirements,
              },
            },
          );

        case 'AGREE':
          // Check if terms are different from current job item
          const agreedTerms = {
            quantity: proposedTerms?.quantity,
            pricePerUnit: proposedTerms?.pricePerUnit,
            requirements: proposedTerms?.requirements,
          };
          const currentJobTerms = {
            quantity: jobItem.quantity,
            pricePerUnit: jobItem.pricePerUnit,
            requirements: jobItem.requirements,
          };
          if (
            agreedTerms.quantity === currentJobTerms.quantity &&
            agreedTerms.pricePerUnit === currentJobTerms.pricePerUnit &&
            agreedTerms.requirements === currentJobTerms.requirements
          ) {
            return gameHelper.function.response.failed(
              'Cannot agree to terms that differ from current proposal. Use COUNTER to propose new terms first.',
            );
          }
          // Check if last message was from this agent
          const messages = await messageQueries.getByChatId(chat.id);
          const lastMessage = messages[0];
          if (lastMessage?.authorId === agentId) {
            return gameHelper.function.response.failed(
              'You cannot agree to your own counter-offer. Wait for your counterpart to respond.',
            );
          }
          if (agentId === job.providerId) {
            await jobQueries.updatePhase(jobId, JobPhases.Enum.TRANSACTION);
            // Send agreement message
            const agreeMessageId = `message-${chat.id}-${Date.now()}`;
            await messageQueries.create({
              id: agreeMessageId,
              chatId: chat.id,
              authorId: agentId,
              message,
            });
            return gameHelper.function.response.success(
              'Agreement reached - proceeding to payment',
              {
                nextPhase: JobPhases.Enum.TRANSACTION,
              },
            );
          }
          // Send agreement message for client
          const agreeMessageId = `message-${chat.id}-${Date.now()}`;
          await messageQueries.create({
            id: agreeMessageId,
            chatId: chat.id,
            authorId: agentId,
            message,
          });
          return gameHelper.function.response.success(
            'Agreement noted - waiting for provider confirmation',
          );

        default:
          // Send general message
          const generalMessageId = `message-${chat.id}-${Date.now()}`;
          await messageQueries.create({
            id: generalMessageId,
            chatId: chat.id,
            authorId: agentId,
            message,
          });
          return gameHelper.function.response.success('Message sent', {
            responseType: intention,
          });
      }
    } catch (e) {
      return gameHelper.function.response.failed(
        `Failed to send negotiation message - ${e}`,
        {
          jobId,
        },
      );
    }
  },
});
