import { gameHelper } from '@/lib/helpers/game.helper';
import { response } from '@/lib/utils/game.utils';
import { chatQueries, jobQueries, messageQueries } from '@acpl/db/queries';
import { GameFunction } from '@virtuals-protocol/game';

export const accept = new GameFunction({
  name: 'accept',
  description: 'Accept a job request to begin negotiations',
  hint: "Use this to accept a job request and start the negotiation phase. Include your response to the client's request.",
  args: [
    {
      name: 'jobId',
      type: 'string',
      description: 'The ID of the job to accept',
    },
    {
      name: 'reply',
      type: 'string',
      description: "Your response to the client's request",
    },
  ] as const,
  executable: async (args, _logger) => {
    const providerId = gameHelper.agent.who(args);
    const { jobId, reply } = args;

    if (!jobId) {
      return response.failed('Job ID is required');
    }
    if (!reply) {
      return response.failed('Reply is required');
    }

    try {
      // Get job details
      const job = await jobQueries.getById(jobId);
      if (!job) {
        return response.failed('Job not found');
      }

      // Verify this is the provider accepting
      if (job.providerId !== providerId) {
        return response.failed('Only the provider can accept this job');
      }

      // Can only accept in REQUEST phase
      if (job.phase !== 'REQUEST') {
        return response.failed(`Cannot accept job in ${job.phase} phase`);
      }

      // Get chat to send acceptance message
      const chat = await chatQueries.getByJobId(jobId);
      if (!chat) {
        return response.failed('Chat not found');
      }

      // Send reply message
      const messageId = `message-${chat.id}-${Date.now()}`;
      await messageQueries.create({
        id: messageId,
        chatId: chat.id,
        authorId: providerId,
        message: reply,
      });

      // Update job phase to NEGOTIATION
      await jobQueries.updatePhase(jobId, 'NEGOTIATION');

      return response.success('Started negotiation with client', {
        jobId,
        nextPhase: 'NEGOTIATION',
      });
    } catch (e) {
      return response.failed(`Failed to accept job - ${e}`, { jobId });
    }
  },
});
