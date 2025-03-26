import { gameHelper } from '@/lib/helpers/game.helper';
import { chatQueries, messageQueries } from '@acpl/db/queries';
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
  hint: 'IMPORTANT: Use this function to read messages before taking any action. You will receive notifications when you have unread messages from your counterpart. Always read messages before accepting/rejecting, negotiating, or completing transactions.',
  args: [
    {
      name: 'chatId',
      description: 'ID of the chat to read messages from',
      type: 'string',
    },
  ] as const,
  executable: async (args, _logger) => {
    const agentId = gameHelper.agent.who(args);

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
      if (!chat || (chat.clientId !== agentId && chat.providerId !== agentId)) {
        return gameHelper.function.response.failed(
          'Chat not found or not authorized',
        );
      }

      const messages = await messageQueries.getByChatId(chatId);

      // Update lastReadBy to mark messages as read
      await chatQueries.updateLastReadBy(chatId, agentId);

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
