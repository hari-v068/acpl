import { gameHelper } from '@/lib/helpers/game.helper';
import { serviceHelper } from '@/lib/helpers/service.helper';
import { chatQueries, jobQueries, messageQueries } from '@acpl/db/queries';
import { JobPhases } from '@acpl/types';
import { GameFunction } from '@virtuals-protocol/game';
import { z } from 'zod';

const AcceptArgsSchema = z.object({
  jobId: z.string().min(1, 'Job ID is required'),
  message: z.string().min(1, 'Message is required'),
});

type AcceptArgs = z.infer<typeof AcceptArgsSchema>;

export const accept = new GameFunction({
  name: 'accept',
  description: 'Accept a job request to begin negotiations',
  hint: `
    Use this function to accept a job request based on your role:

    AS A PROVIDER:
    - Review the client's request and requirements
    - Accept if you can fulfill the requirements
    - Job moves to NEGOTIATION only after both you and evaluator (if any) accept
    - Include a message confirming your ability to meet requirements

    AS AN EVALUATOR:
    - Review if you can effectively evaluate the requested item/service
    - Accept if you can properly assess against the requirements
    - Job moves to NEGOTIATION only after both you and provider accept
    - Include a message confirming your evaluation capabilities

    IMPORTANT FOR BOTH ROLES:
    - Can only be used in REQUEST phase
    - Must read all messages before accepting
    - Your acceptance will be recorded but job stays in REQUEST until all parties accept
  `,
  args: [
    {
      name: 'jobId',
      type: 'string',
      description: 'The ID of the job to accept',
    },
    {
      name: 'message',
      type: 'string',
      description: 'Your response to the request',
    },
  ] as const,
  executable: async (args, _logger) => {
    const agentId = gameHelper.function.who(args);

    const parseResult = AcceptArgsSchema.safeParse(args);
    if (!parseResult.success) {
      return gameHelper.function.response.failed(
        parseResult.error.issues[0].message,
      );
    }

    const { jobId, message } = parseResult.data;

    try {
      const job = await jobQueries.getById(jobId);
      if (!job) {
        return gameHelper.function.response.failed('Job not found');
      }

      // Verify this is either the provider or evaluator
      if (job.providerId !== agentId && job.evaluatorId !== agentId) {
        return gameHelper.function.response.failed(
          'Only the provider or evaluator can accept this job',
        );
      }

      // Can only accept in REQUEST phase
      if (job.phase !== JobPhases.Enum.REQUEST) {
        return gameHelper.function.response.failed(
          `Cannot accept job in ${job.phase} phase`,
        );
      }

      // Check if already accepted
      const currentAcceptance = job.metadata?.acceptance || {};
      if (currentAcceptance[agentId]?.acceptedAt) {
        const otherPartyId =
          agentId === job.providerId ? job.evaluatorId : job.providerId;
        const otherPartyAccepted = otherPartyId
          ? currentAcceptance[otherPartyId]?.acceptedAt
          : true;

        if (!otherPartyAccepted) {
          return gameHelper.function.response.failed(
            `You have already accepted this job. Waiting for ${otherPartyId === job.providerId ? 'provider' : 'evaluator'} to accept. Use reject if you want to change your mind.`,
          );
        }
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

      // Only send acceptance message if this is the provider
      if (agentId === job.providerId) {
        // Send acceptance message
        const messageId = `message-${chat.id}-${Date.now()}`;
        await messageQueries.create({
          id: messageId,
          chatId: chat.id,
          authorId: agentId,
          message,
        });
      }

      // Update acceptance in job metadata
      const updatedAcceptance = {
        ...currentAcceptance,
        [agentId]: {
          acceptedAt: new Date().toISOString(),
        },
      };

      await jobQueries.updateMetadata(jobId, {
        ...job.metadata,
        acceptance: updatedAcceptance,
      });

      // Check if all required parties have accepted
      const providerAccepted = updatedAcceptance[job.providerId]?.acceptedAt;
      const evaluatorAccepted = job.evaluatorId
        ? updatedAcceptance[job.evaluatorId]?.acceptedAt
        : true;

      if (providerAccepted && evaluatorAccepted) {
        // Move to NEGOTIATION phase if all parties have accepted
        await jobQueries.updatePhase(jobId, JobPhases.Enum.NEGOTIATION);
        return gameHelper.function.response.success(
          'All parties have accepted - proceeding to negotiation',
          {
            jobId,
            nextPhase: JobPhases.Enum.NEGOTIATION,
          },
        );
      }

      return gameHelper.function.response.success(
        'Acceptance recorded - waiting for other party',
        {
          jobId,
          currentPhase: JobPhases.Enum.REQUEST,
        },
      );
    } catch (e) {
      return gameHelper.function.response.failed(
        `Failed to accept job - ${e}`,
        { jobId },
      );
    }
  },
});
