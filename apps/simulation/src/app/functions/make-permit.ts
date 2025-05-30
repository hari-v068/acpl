import { gameHelper } from '@/lib/helpers/game.helper';
import {
  inventoryItemQueries,
  itemQueries,
  jobItemQueries,
  jobQueries,
} from '@acpl/db/queries';
import { JobPhases, type ItemMetadata } from '@acpl/types';
import { GameFunction } from '@virtuals-protocol/game';

export const makePermit = new GameFunction({
  name: 'make_permit',
  description: 'Create a digital business permit.',
  hint: 'Use this during the TRANSACTION phase of a job to create and link a permit.',
  args: [
    {
      name: 'jobId',
      type: 'string',
      description: 'The job ID you want to make a permit for',
    },
  ] as const,
  executable: async (args, _logger) => {
    const providerId = gameHelper.function.who(args);
    const { jobId } = args;

    if (!jobId) {
      return gameHelper.function.response.failed(
        'Missing jobId - specify the job ID for this permit',
      );
    }

    try {
      // Get job details and validate phase
      const job = await jobQueries.getById(jobId);
      if (!job) {
        return gameHelper.function.response.failed('Job not found');
      }

      if (job.phase !== JobPhases.Enum.TRANSACTION) {
        return gameHelper.function.response.failed(
          'Job must be in TRANSACTION phase',
        );
      }

      if (job.providerId !== providerId) {
        return gameHelper.function.response.failed(
          'Only the provider can create permits for this job',
        );
      }

      // Get job item details
      const jobItem = await jobItemQueries.getByJobId(jobId);
      if (!jobItem) {
        return gameHelper.function.response.failed(
          'No item found for this job',
        );
      }

      const permitItem = await itemQueries.create({
        id: `item-permit-${jobId}`,
        agentId: providerId,
        name: 'Business Permit',
        metadata: {
          itemType: 'DIGITAL',
          description: 'Official business operation permit',
          url: `https://permits.example.com/verify/${jobId}`,
        } as ItemMetadata,
      });

      // Add permit to provider's inventory (will be transferred to client during delivery)
      const providerPermitInventory = await inventoryItemQueries.create({
        id: `inventory-permit-${jobId}`,
        agentId: providerId,
        itemId: permitItem.id,
        quantity: jobItem.quantity,
      });

      // Update job item with the created inventory item
      await jobItemQueries.updateInventoryItemId(
        jobItem.id,
        providerPermitInventory.id,
      );

      return gameHelper.function.response.success(
        `Successfully created ${jobItem.quantity} business permit(s)`,
        {
          permitId: permitItem.id,
          quantity: jobItem.quantity,
          metadata: permitItem.metadata,
        },
      );
    } catch (e) {
      return gameHelper.function.response.failed(
        `Failed to create permit - ${e}`,
      );
    }
  },
});
