import { dbHelper } from '@/lib/helpers/db.helper';
import { gameHelper } from '@/lib/helpers/game.helper';
import { chatQueries, jobQueries, messageQueries } from '@acpl/db/queries';
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
  hint: 'Use this to reject an initial job request. For ongoing negotiations, use negotiate function.',
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
    const providerId = gameHelper.agent.who(args);

    const parseResult = RejectArgsSchema.safeParse(args);
    if (!parseResult.success) {
      return gameHelper.function.response.failed(
        parseResult.error.issues[0].message,
      );
    }

    const { jobId, message } = parseResult.data;

    try {
      const chatRead = await dbHelper.utils.verifyChatRead(jobId, providerId);
      if (!chatRead) {
        return gameHelper.function.response.failed(
          'You must read all messages before taking this action. Use the read function first.',
        );
      }

      const job = await jobQueries.getById(jobId);
      if (!job) {
        return gameHelper.function.response.failed('Job not found');
      }

      // Verify this is the provider rejecting
      if (job.providerId !== providerId) {
        return gameHelper.function.response.failed(
          'Only the provider can reject this job',
        );
      }

      // Can only reject in REQUEST phase
      if (job.phase !== 'REQUEST') {
        return gameHelper.function.response.failed(
          `Cannot reject job in ${job.phase} phase`,
        );
      }

      const chat = await chatQueries.getByJobId(jobId);
      if (!chat) {
        return gameHelper.function.response.failed('Chat not found');
      }

      // Send rejection message
      const messageId = `message-${chat.id}-${Date.now()}`;
      await messageQueries.create({
        id: messageId,
        chatId: chat.id,
        authorId: providerId,
        message: message,
      });

      await jobQueries.updatePhase(jobId, 'REJECTED');

      return gameHelper.function.response.success('Job request rejected', {
        nextPhase: 'REJECTED',
      });
    } catch (e) {
      return gameHelper.function.response.failed(
        `Failed to reject job - ${e}`,
        { jobId },
      );
    }
  },
});
