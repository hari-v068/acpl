import { gameHelper } from '@/lib/helpers/game.helper';
import { response } from '@/lib/utils/game.utils';
import {
  chatQueries,
  inventoryItemQueries,
  itemQueries,
  jobItemQueries,
  jobQueries,
  messageQueries,
  walletQueries,
} from '@acpl/db/queries';
import { GameFunction } from '@virtuals-protocol/game';

export const evaluatePhysical = new GameFunction({
  name: 'evaluate_physical',
  description: 'Evaluate a delivered physical item (lemons, lemonade, etc.)',
  hint: 'Use this to evaluate a delivered physical item during the EVALUATION phase.',
  args: [
    {
      name: 'jobId',
      type: 'string',
      description: 'The ID of the job to evaluate',
    },
    {
      name: 'message',
      type: 'string',
      description: 'Message explaining the evaluation',
    },
  ] as const,
  executable: async (args, _logger) => {
    const evaluatorId = gameHelper.agent.who(args);
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

      // Verify this is the evaluator
      if (evaluatorId !== 'evaluator') {
        return response.failed('Only the evaluator can evaluate items');
      }

      // Must be in EVALUATION phase
      if (job.phase !== 'EVALUATION') {
        return response.failed(`Cannot evaluate in ${job.phase} phase`);
      }

      // Get job item and its inventory item
      const jobItem = await jobItemQueries.getByJobId(jobId);
      if (!jobItem || !jobItem.inventoryItemId) {
        return response.failed('No delivered item found for this job');
      }

      const inventoryItem = await inventoryItemQueries.getById(
        jobItem.inventoryItemId,
      );
      if (!inventoryItem) {
        return response.failed('Inventory item not found');
      }

      // Get the actual item
      const item = await itemQueries.getById(inventoryItem.itemId);
      if (!item) {
        return response.failed('Item not found');
      }

      // Get chat to send evaluation message
      const chat = await chatQueries.getByJobId(jobId);
      if (!chat) {
        return response.failed('Chat not found');
      }

      // Send evaluation message
      const messageId = `message-${chat.id}-${Date.now()}`;
      await messageQueries.create({
        id: messageId,
        chatId: chat.id,
        authorId: evaluatorId,
        message,
      });

      // Simple validation for physical items (95% success rate)
      const isValid = Math.random() < 0.95;

      if (isValid) {
        // Calculate payment split (95% provider, 5% evaluator)
        const totalPayment =
          Number(jobItem.quantity) * Number(jobItem.pricePerUnit);
        const providerPayment = (totalPayment * 0.95).toFixed(2);
        const evaluatorPayment = (totalPayment * 0.05).toFixed(2);

        // Get provider's wallet
        const providerWallet = await walletQueries.getByAgentId(job.providerId);
        if (!providerWallet) {
          return response.failed('Provider wallet not found');
        }

        // Get evaluator's wallet
        const evaluatorWallet = await walletQueries.getByAgentId(evaluatorId);
        if (!evaluatorWallet) {
          return response.failed('Evaluator wallet not found');
        }

        // Update balances
        await walletQueries.addBalance(providerWallet.id, providerPayment);
        await walletQueries.addBalance(evaluatorWallet.id, evaluatorPayment);

        // Move item to client's inventory
        await inventoryItemQueries.transferOwnership(
          inventoryItem.id,
          job.clientId,
        );

        // Update job phase to COMPLETE
        await jobQueries.updatePhase(jobId, 'COMPLETE');

        return response.success(
          'Physical item evaluated and delivered successfully',
          {
            evaluation: { matches_description: true },
            payment: {
              provider: providerPayment,
              evaluator: evaluatorPayment,
            },
          },
        );
      } else {
        // If evaluation fails, reject the job
        await jobQueries.updatePhase(jobId, 'REJECTED');
        return response.success('Physical item evaluation failed', {
          evaluation: { matches_description: false },
        });
      }
    } catch (e) {
      return response.failed(`Failed to evaluate physical item - ${e}`);
    }
  },
});
