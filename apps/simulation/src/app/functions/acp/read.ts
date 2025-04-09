import { gameHelper } from '@/lib/helpers/game.helper';
import { chatQueries, messageQueries, jobQueries } from '@acpl/db/queries';
import { GameFunction } from '@virtuals-protocol/game';
import { z } from 'zod';

const ReadArgsSchema = z.object({
  chatId: z.string().min(1, 'Chat ID is required'),
});

type ReadArgs = z.infer<typeof ReadArgsSchema>;

export const read = new GameFunction({
  name: 'read',
  description:
    'Read all messages in a chat to stay informed and make decisions',
  hint: `
    Use this function to read messages in a chat. This is a CRITICAL function that must be used before taking any action. Important notes:

    - You will receive notifications when there are unread messages
    - You must read messages before using any other function (negotiate, accept, reject, pay, deliver)
    - Only you and your counterpart can read the chat
    - Messages are marked as read after viewing
    - Each message includes the author, content, and timestamp

    After reading messages, you should respond appropriately using the relevant function based on the job phase and context.
  `,
  args: [
    {
      name: 'chatId',
      description: 'ID of the chat to read messages from',
      type: 'string',
    },
  ] as const,
  executable: async (args, _logger) => {
    const agentId = gameHelper.function.who(args);

    // Validate args using Zod
    const parseResult = ReadArgsSchema.safeParse({
      chatId: args.chatId,
    });
    if (!parseResult.success) {
      return gameHelper.function.response.failed(
        parseResult.error.issues[0].message,
      );
    }

    const { chatId } = parseResult.data;

    try {
      const chat = await chatQueries.getById(chatId);
      if (!chat) {
        return gameHelper.function.response.failed('Chat not found');
      }

      const job = await jobQueries.getById(chat.jobId);
      if (!job) {
        return gameHelper.function.response.failed('Job not found');
      }

      if (
        chat.clientId !== agentId &&
        chat.providerId !== agentId &&
        job.evaluatorId !== agentId
      ) {
        return gameHelper.function.response.failed(
          'Not authorized to read this chat',
        );
      }

      await chatQueries.updateLastReadBy(chatId, agentId);

      const messages = await messageQueries.getByChatId(chatId);
      return gameHelper.function.response.success('Messages read', {
        messages: messages.map((message) => ({
          id: message.id,
          authorId: message.authorId,
          message: message.message,
          createdAt: message.createdAt,
        })),
      });
    } catch (e) {
      return gameHelper.function.response.failed(
        `Failed to read messages - ${e}`,
      );
    }
  },
});
