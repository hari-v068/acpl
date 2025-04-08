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
  'CANCEL',
  'GENERAL',
]);

// Terms schema for all actions except CANCEL and GENERAL
const TermsSchema = z.object({
  quantity: z.number().int().positive(),
  pricePerUnit: z.coerce
    .number()
    .positive('Price must be greater than 0')
    .max(999999999.99, 'Price exceeds maximum allowed value')
    .transform((num) => num.toFixed(2)),
  requirements: z.string().min(1),
});

const NegotiateArgsSchema = z
  .object({
    jobId: z.string().min(1, 'Job ID is required'),
    message: z.string().min(1, 'Message is required'),
    intention: NegotiationIntentionEnum,
    proposedTerms: z.union([TermsSchema, z.undefined()]),
  })
  .refine(
    (data) => {
      if (data.intention === 'AGREE' || data.intention === 'COUNTER') {
        return data.proposedTerms !== undefined;
      }
      return true;
    },
    {
      message: 'AGREE and COUNTER require all terms to be specified.',
    },
  );

type NegotiationIntention = z.infer<typeof NegotiationIntentionEnum>;
type NegotiateArgs = z.infer<typeof NegotiateArgsSchema>;

export const negotiate = new GameFunction({
  name: 'negotiate',
  description: 'Send a message during job negotiation',
  hint: `
    Use this to negotiate job terms during the NEGOTIATION phase. Each intention has a specific purpose:

    - AGREE: Use when you want to accept the current terms. You must provide the exact same terms as currently proposed.
    - COUNTER: Use when you want to propose new terms. You must provide all terms (quantity, price, requirements) that differ from current proposal.
    - CANCEL: Use when you want to end the negotiation without reaching an agreement.
    - GENERAL: Use for general discussion without changing any terms.

    Remember: You must read all messages before taking any action.
  `,
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
      description: 'Quantity being proposed',
      optional: true,
    },
    {
      name: 'pricePerUnit',
      type: 'string',
      description: 'Price per unit being proposed',
      optional: true,
    },
    {
      name: 'requirements',
      type: 'string',
      description: 'Requirements being proposed',
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
    if (args.intention === 'COUNTER' || args.intention === 'AGREE') {
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
      if (job.phase !== JobPhases.Enum.NEGOTIATION) {
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
          proposedTerms.quantity === jobItem.quantity &&
          proposedTerms.pricePerUnit === jobItem.pricePerUnit &&
          proposedTerms.requirements === jobItem.requirements;

        if (hasSameTerms) {
          return gameHelper.function.response.failed(
            'Cannot make a counter-offer with the same terms. Please propose different terms.',
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
          // Clear any existing agreements when new terms are proposed
          await jobQueries.updateMetadata(jobId, {
            agreement: {},
          });

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
              newTerms: proposedTerms,
            },
          );

        case 'AGREE':
          // Check if terms match current job item
          if (
            proposedTerms?.quantity !== jobItem.quantity ||
            proposedTerms?.pricePerUnit !== jobItem.pricePerUnit ||
            proposedTerms?.requirements !== jobItem.requirements
          ) {
            return gameHelper.function.response.failed(
              'Cannot agree to terms that differ from current proposal. Use COUNTER to propose new terms first.',
            );
          }

          // Track agreement in job metadata
          const currentAgreement = job.metadata?.agreement || {};
          const updatedAgreement = {
            ...currentAgreement,
            [agentId]: {
              agreedAt: new Date().toISOString(),
              terms: proposedTerms,
            },
          };

          await jobQueries.updateMetadata(jobId, {
            ...job.metadata,
            agreement: updatedAgreement,
          });

          // Check if both parties have agreed to the same terms
          const otherPartyId =
            agentId === job.providerId ? job.clientId : job.providerId;
          const otherPartyAgreement = updatedAgreement[otherPartyId];
          const bothPartiesAgreed =
            otherPartyAgreement &&
            otherPartyAgreement.terms.quantity === proposedTerms.quantity &&
            otherPartyAgreement.terms.pricePerUnit ===
              proposedTerms.pricePerUnit &&
            otherPartyAgreement.terms.requirements ===
              proposedTerms.requirements;

          // If both parties agree, move to TRANSACTION phase
          if (bothPartiesAgreed) {
            await jobQueries.updatePhase(jobId, JobPhases.Enum.TRANSACTION);
            // Send agreement message
            const agreeMessageId = `message-${chat.id}-${Date.now()}`;
            await messageQueries.create({
              id: agreeMessageId,
              chatId: chat.id,
              authorId: agentId,
              message: `${message} (Final agreement reached - proceeding to payment)`,
            });
            return gameHelper.function.response.success(
              'Mutual agreement reached - proceeding to payment',
              {
                nextPhase: JobPhases.Enum.TRANSACTION,
              },
            );
          }

          // Send agreement message while waiting for other party
          const agreeMessageId = `message-${chat.id}-${Date.now()}`;
          await messageQueries.create({
            id: agreeMessageId,
            chatId: chat.id,
            authorId: agentId,
            message: `${message} (Waiting for other party's agreement)`,
          });
          return gameHelper.function.response.success(
            'Agreement recorded - waiting for other party to agree',
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
