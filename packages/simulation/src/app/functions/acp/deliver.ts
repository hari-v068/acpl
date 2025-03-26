import { gameHelper } from '@/lib/helpers/game.helper';
import { response } from '@/lib/utils/game.utils';
import {
  chatQueries,
  jobItemQueries,
  jobQueries,
  messageQueries,
} from '@acpl/db/queries';
import { GameFunction } from '@virtuals-protocol/game';

export const deliver = new GameFunction({
  name: 'deliver',
  description: 'Deliver an item for evaluation',
  hint: 'Use this to deliver an item for evaluation during the TRANSACTION phase.',
  args: [
    {
      name: 'jobId',
      type: 'string',
      description: 'The ID of the job to deliver for',
    },
    {
      name: 'message',
      type: 'string',
      description: 'Message about the delivery',
    },
  ] as const,
  executable: async (args, _logger) => {
    const providerId = gameHelper.agent.who(args);
    const { jobId, message } = args;

    if (!jobId) {
      return response.failed('Job ID is required');
    }
    if (!message) {
      return response.failed('Message is required');
    }

    try {
      // Get job details
      const job = await jobQueries.getById(jobId);
      if (!job) {
        return response.failed('Job not found');
      }

      // Verify this is the provider delivering
      if (job.providerId !== providerId) {
        return response.failed('Only the provider can deliver items');
      }

      // Must be in TRANSACTION phase
      if (job.phase !== 'TRANSACTION') {
        return response.failed(`Cannot deliver in ${job.phase} phase`);
      }

      // Get job item and verify it has an inventory item
      const jobItem = await jobItemQueries.getByJobId(jobId);
      if (!jobItem || !jobItem.inventoryItemId) {
        return response.failed('No item found for this job');
      }

      // Get chat to send delivery message
      const chat = await chatQueries.getByJobId(jobId);
      if (!chat) {
        return response.failed('Chat not found');
      }

      // Send delivery message
      const messageId = `message-${chat.id}-${Date.now()}`;
      await messageQueries.create({
        id: messageId,
        chatId: chat.id,
        authorId: providerId,
        message,
      });

      // Update job phase to EVALUATION
      await jobQueries.updatePhase(jobId, 'EVALUATION');

      return response.success('Item delivered for evaluation', {
        nextPhase: 'EVALUATION',
      });
    } catch (e) {
      return response.failed(`Failed to deliver item - ${e}`);
    }
  },
});
