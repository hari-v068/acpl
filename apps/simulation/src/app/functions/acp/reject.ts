import { gameHelper } from '@/lib/helpers/game.helper';
import { serviceHelper } from '@/lib/helpers/service.helper';
import { chatQueries, jobQueries, messageQueries } from '@acpl/db/queries';
import { JobPhases } from '@acpl/types';
import { GameFunction } from '@virtuals-protocol/game';
import { z } from 'zod';

const RejectArgsSchema = z.object({
  jobId: z.string().min(1, 'Job ID is required'),
  message: z.string().min(1, 'Message is required'),
});

type RejectArgs = z.infer<typeof RejectArgsSchema>;

export const reject = new GameFunction({
  name: 'reject',
  description: 'Reject a job request',
  hint: `
    Use this function to reject a job request based on your role:

    AS A PROVIDER:
    - Reject if you cannot fulfill the requirements
    - Reject if terms are completely unacceptable
    - Include clear explanation of why you cannot proceed
    - Job will move to REJECTED phase immediately

    AS AN EVALUATOR:
    - Reject if you cannot properly evaluate this type of item/service
    - Reject if requirements are too vague to assess
    - Include explanation of evaluation limitations
    - Job will move to REJECTED phase immediately

    IMPORTANT FOR BOTH ROLES:
    - Can only be used in REQUEST phase
    - Must read all messages before rejecting
    - For ongoing negotiations, use negotiate with CANCEL intention instead
  `,
  args: [
    {
      name: 'jobId',
      type: 'string',
      description: 'The ID of the job to reject',
    },
    {
      name: 'message',
      type: 'string',
      description: 'Message about rejecting the job',
    },
  ] as const,
  executable: async (args, _logger) => {
    const agentId = gameHelper.function.who(args);

    const parseResult = RejectArgsSchema.safeParse(args);
    if (!parseResult.success) {
      return gameHelper.function.response.failed(
        parseResult.error.issues[0].message,
      );
    }

    const { jobId, message } = parseResult.data;

    try {
      // Get job details first
      const job = await jobQueries.getById(jobId);
      if (!job) {
        return gameHelper.function.response.failed('Job not found');
      }

      // Verify this is either the provider or evaluator
      if (job.providerId !== agentId && job.evaluatorId !== agentId) {
        return gameHelper.function.response.failed(
          'Only the provider or evaluator can reject this job',
        );
      }

      // Can only reject in REQUEST phase
      if (job.phase !== JobPhases.Enum.REQUEST) {
        return gameHelper.function.response.failed(
          `Cannot reject job in ${job.phase} phase`,
        );
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

      // Only send rejection message if this is the provider
      if (agentId === job.providerId) {
        // Send rejection message
        const messageId = `message-${chat.id}-${Date.now()}`;
        await messageQueries.create({
          id: messageId,
          chatId: chat.id,
          authorId: agentId,
          message,
        });
      }

      // Update rejection in job metadata
      const currentAcceptance = job.metadata?.acceptance || {};
      const updatedAcceptance = {
        ...currentAcceptance,
        [agentId]: {
          ...currentAcceptance[agentId],
          rejectedAt: new Date().toISOString(),
        },
      };

      await jobQueries.updateMetadata(jobId, {
        ...job.metadata,
        acceptance: updatedAcceptance,
      });

      // Update job phase to REJECTED
      await jobQueries.updatePhase(jobId, JobPhases.Enum.REJECTED);

      return gameHelper.function.response.success('Job request rejected', {
        jobId,
        nextPhase: JobPhases.Enum.REJECTED,
      });
    } catch (e) {
      return gameHelper.function.response.failed(
        `Failed to reject job - ${e}`,
        { jobId },
      );
    }
  },
});
