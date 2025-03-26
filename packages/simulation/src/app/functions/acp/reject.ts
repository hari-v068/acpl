import { gameHelper } from '@/lib/helpers/game.helper';
import { response } from '@/lib/utils/game.utils';
import { chatQueries, jobQueries, messageQueries } from '@acpl/db/queries';
import { GameFunction } from '@virtuals-protocol/game';

export const reject = new GameFunction({
  name: 'reject',
  description: 'Reject a job request',
  hint: 'Use this to reject an initial job request. For ongoing negotiations, use negotiate function.',
  args: [
    {
      name: 'jobId',
      type: 'string',
      description: 'The ID of the job to reject',
    },
    {
      name: 'reason',
      type: 'string',
      description: 'Reason for rejecting the job',
    },
  ] as const,
  executable: async (args, _logger) => {
    const providerId = gameHelper.agent.who(args);
    const { jobId, reason } = args;

    if (!jobId) {
      return response.failed('Job ID is required');
    }
    if (!reason) {
      return response.failed('Reason is required');
    }

    try {
      const job = await jobQueries.getById(jobId);
      if (!job) {
        return response.failed('Job not found');
      }

      // Verify this is the provider rejecting
      if (job.providerId !== providerId) {
        return response.failed('Only the provider can reject this job');
      }

      // Can only reject in REQUEST phase
      if (job.phase !== 'REQUEST') {
        return response.failed(`Cannot reject job in ${job.phase} phase`);
      }

      const chat = await chatQueries.getByJobId(jobId);
      if (!chat) {
        return response.failed('Chat not found');
      }

      // Send rejection message
      const messageId = `message-${chat.id}-${Date.now()}`;
      await messageQueries.create({
        id: messageId,
        chatId: chat.id,
        authorId: providerId,
        message: reason,
      });

      await jobQueries.updatePhase(jobId, 'REJECTED');

      return response.success('Job request rejected', {
        nextPhase: 'REJECTED',
      });
    } catch (e) {
      return response.failed(`Failed to reject job - ${e}`, { jobId });
    }
  },
});
