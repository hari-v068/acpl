import { response } from '@/lib/utils/game.utils';
import { GameFunction } from '@virtuals-protocol/game';
import { z } from 'zod';

export const read = new GameFunction({
  name: 'read',
  description: 'Read a message from a chat',
  hint: 'Use this function to read a message from a chat. You need to specify the chat ID and the message ID.',
  args: [
    {
      name: 'chatId',
      description: 'ID of the chat',
      type: 'string',
    },
  ] as const,
  executable: async (args, _logger) => {
    try {
      return response.success('something');
    } catch (e) {
      return response.failed(`Failed to create service request - ${e}`);
    }
  },
});
