import { serviceHelper } from '@/lib/helpers/service.helper';
import { gameHelper } from '@/lib/helpers/game.helper';
import {
  chatQueries,
  inventoryItemQueries,
  jobItemQueries,
  jobQueries,
  messageQueries,
} from '@acpl/db/queries';
import { GameFunction } from '@virtuals-protocol/game';
import { z } from 'zod';
import { JobPhases } from '@acpl/types';

const DeliverArgsSchema = z.object({
  jobId: z.string().min(1, 'Job ID is required'),
  message: z.string().min(1, 'Message is required'),
});

type DeliverArgs = z.infer<typeof DeliverArgsSchema>;

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
    const providerId = gameHelper.function.who(args);

    const parseResult = DeliverArgsSchema.safeParse(args);
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

      // Verify this is the provider delivering
      if (job.providerId !== providerId) {
        return gameHelper.function.response.failed(
          'Only the provider can deliver items',
        );
      }

      // Must be in TRANSACTION phase
      if (job.phase !== 'TRANSACTION') {
        return gameHelper.function.response.failed(
          `Cannot deliver in ${job.phase} phase`,
        );
      }

      // Check if payment has been made by verifying transaction hash exists
      if (!job.transactionHash) {
        return gameHelper.function.response.failed(
          'Cannot deliver before payment is received',
        );
      }

      // Get job item and verify it has an inventory item
      const jobItem = await jobItemQueries.getByJobId(jobId);
      if (!jobItem) {
        return gameHelper.function.response.failed(
          'No item found for this job',
        );
      }

      // If no inventory item is linked yet, try to link one
      if (!jobItem.inventoryItemId) {
        // Get the provider's inventory items
        const inventoryItems =
          await inventoryItemQueries.getByAgentId(providerId);

        // Find matching inventory item by name and quantity
        const matchingItem = inventoryItems.find(
          (item) =>
            item.item.name === jobItem.itemName &&
            item.quantity >= jobItem.quantity,
        );

        if (!matchingItem) {
          return gameHelper.function.response.failed(
            'No matching inventory items found for this job',
          );
        }

        // Link the inventory item to the job
        await jobItemQueries.updateInventoryItemId(jobItem.id, matchingItem.id);
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

      // Send delivery message
      const messageId = `message-${chat.id}-${Date.now()}`;
      await messageQueries.create({
        id: messageId,
        chatId: chat.id,
        authorId: providerId,
        message,
      });

      // Update job phase to EVALUATION
      await jobQueries.updatePhase(jobId, JobPhases.Enum.EVALUATION);

      return gameHelper.function.response.success(
        'Item delivered for evaluation',
        {
          nextPhase: JobPhases.Enum.EVALUATION,
        },
      );
    } catch (e) {
      return gameHelper.function.response.failed(
        `Failed to deliver item - ${e}`,
      );
    }
  },
});
