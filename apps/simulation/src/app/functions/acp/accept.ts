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
    Use this function to accept a client's initial job request. Important notes:

    - Only the provider can accept the job
    - Can only be used in REQUEST phase
    - Must read all messages before accepting
    - Will move the job to NEGOTIATION phase
    - Include a message explaining why you're accepting the request

    After accepting, you can use the negotiate function to discuss and adjust the terms.
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
      description: "Your response to the client's request",
    },
  ] as const,
  executable: async (args, _logger) => {
    const providerId = gameHelper.function.who(args);

    const parseResult = AcceptArgsSchema.safeParse(args);
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

      // Verify this is the provider accepting
      if (job.providerId !== providerId) {
        return gameHelper.function.response.failed(
          'Only the provider can accept this job',
        );
      }

      // Can only accept in REQUEST phase
      if (job.phase !== 'REQUEST') {
        return gameHelper.function.response.failed(
          `Cannot accept job in ${job.phase} phase`,
        );
      }

      // Get chat to check messages
      const chat = await chatQueries.getByJobId(jobId);
      if (!chat) {
        return gameHelper.function.response.failed('Chat not found');
      }

      const hasUnreadMessages = serviceHelper.chat.hasUnreadMessages(
        chat,
        providerId,
      );
      if (hasUnreadMessages) {
        return gameHelper.function.response.failed(
          'You must read all messages before taking this action. Use the read function first.',
        );
      }

      const messageId = `message-${chat.id}-${Date.now()}`;
      await messageQueries.create({
        id: messageId,
        chatId: chat.id,
        authorId: providerId,
        message: message,
      });

      // Update job phase to NEGOTIATION
      await jobQueries.updatePhase(jobId, JobPhases.Enum.NEGOTIATION);

      return gameHelper.function.response.success(
        'Started negotiation with client',
        {
          jobId,
          nextPhase: JobPhases.Enum.NEGOTIATION,
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
