import { gameHelper } from '@/lib/helpers/game.helper';
import { response } from '@/lib/utils/game.utils';
import {
  inventoryItemQueries,
  itemQueries,
  jobItemQueries,
  jobQueries,
} from '@acpl/db/queries';
import type { ItemMetadata } from '@acpl/types';
import { GameFunction } from '@virtuals-protocol/game';

export const makeLemonade = new GameFunction({
  name: 'make_lemonade',
  description: 'Create lemonade from lemons.',
  hint: 'Use this during the TRANSACTION phase of a job. Requires lemons in your inventory.',
  args: [
    {
      name: 'jobId',
      type: 'string',
      description: 'The job ID you want to make lemonade for',
    },
  ] as const,
  executable: async (args, _logger) => {
    const providerId = gameHelper.agent.who(args);
    const { jobId } = args;

    if (!jobId) {
      return response.failed(
        'Missing jobId - specify the job ID for this lemonade order',
      );
    }

    try {
      // Get job details and validate phase
      const job = await jobQueries.getById(jobId);
      if (!job) {
        return response.failed('Job not found');
      }

      if (job.phase !== 'TRANSACTION') {
        return response.failed('Job must be in TRANSACTION phase');
      }

      if (job.providerId !== providerId) {
        return response.failed(
          'Only the provider can make lemonade for this job',
        );
      }

      // Get job item details to know quantity needed
      const jobItem = await jobItemQueries.getByJobId(jobId);
      if (!jobItem) {
        return response.failed('No item found for this job');
      }

      const lemonsNeeded = jobItem.quantity * 2;

      const providerLemons = await inventoryItemQueries.getByAgentAndItemId(
        providerId,
        'item-lemon-' + providerId,
      );

      if (!providerLemons || providerLemons.quantity < lemonsNeeded) {
        return response.failed(
          `Not enough lemons. Need ${lemonsNeeded} lemons to make ${jobItem.quantity} lemonade`,
        );
      }

      // Create lemonade item if it doesn't exist
      const lemonadeItem = await itemQueries.create({
        id: `item-lemonade-${jobId}`,
        agentId: providerId,
        name: 'Lemonade',
        metadata: {
          itemType: 'PHYSICAL',
          description: 'Fresh lemonade made from farm lemons',
          origin: `Lemo's Lemonade Stand`,
        } as ItemMetadata,
      });

      // Subtract used lemons from provider's inventory
      await inventoryItemQueries.subtractQuantity(
        providerLemons.id,
        lemonsNeeded,
      );

      // Add lemonade to provider's inventory (will be transferred to client during delivery)
      const providerLemonadeInventory = await inventoryItemQueries.create({
        id: `inventory-lemonade-${jobId}`,
        agentId: providerId,
        itemId: lemonadeItem.id,
        quantity: jobItem.quantity,
      });

      await jobItemQueries.updateInventoryItemId(
        jobItem.id,
        providerLemonadeInventory.id,
      );

      return response.success(
        `Successfully made ${jobItem.quantity} lemonade`,
        {
          lemonadeId: lemonadeItem.id,
          lemonsUsed: lemonsNeeded,
          quantity: jobItem.quantity,
          metadata: lemonadeItem.metadata,
        },
      );
    } catch (e) {
      return response.failed(`Failed to make lemonade - ${e}`);
    }
  },
});
