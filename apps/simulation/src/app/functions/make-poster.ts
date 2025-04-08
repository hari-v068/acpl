import { gameHelper } from '@/lib/helpers/game.helper';
import { generateMarketingImage } from '@/lib/utils/ai/leonardo';
import {
  inventoryItemQueries,
  itemQueries,
  jobItemQueries,
  jobQueries,
} from '@acpl/db/queries';
import { JobPhases, type ItemMetadata } from '@acpl/types';
import { GameFunction } from '@virtuals-protocol/game';

export const makePoster = new GameFunction({
  name: 'make_poster',
  description: 'Create a digital poster.',
  hint: 'Use this during the TRANSACTION phase of a job to create and link a poster.',
  args: [
    {
      name: 'jobId',
      type: 'string',
      description: 'The job ID for this poster creation',
    },
    {
      name: 'prompt',
      type: 'string',
      description:
        'The prompt for the poster. Should be a visual description of the poster. For example, "A poster with a picture of a cat and the text "Buy now!"',
    },
  ] as const,
  executable: async (args, _logger) => {
    const providerId = gameHelper.function.who(args);
    const { jobId, prompt } = args;

    if (!jobId) {
      return gameHelper.function.response.failed(
        'Missing jobId - specify the job ID for this poster',
      );
    }
    if (!prompt) {
      return gameHelper.function.response.failed(
        'Missing prompt - specify the prompt for the poster',
      );
    }

    try {
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
          'Only the provider can create posters for this job',
        );
      }

      // Get job item details
      const jobItem = await jobItemQueries.getByJobId(jobId);
      if (!jobItem) {
        return gameHelper.function.response.failed(
          'No item found for this job',
        );
      }

      const imageUrl = await generateMarketingImage(prompt);

      // Create poster item
      const posterItem = await itemQueries.create({
        id: `item-poster-${jobId}`,
        agentId: providerId,
        name: 'Marketing Poster',
        metadata: {
          itemType: 'DIGITAL',
          description: prompt,
          url: imageUrl,
        } as ItemMetadata,
      });

      // Add poster to provider's inventory (will be transferred to client during delivery)
      const providerPosterInventory = await inventoryItemQueries.create({
        id: `inventory-poster-${jobId}`,
        agentId: providerId,
        itemId: posterItem.id,
        quantity: jobItem.quantity,
      });

      // Update job item with the created inventory item
      await jobItemQueries.updateInventoryItemId(
        jobItem.id,
        providerPosterInventory.id,
      );

      return gameHelper.function.response.success(
        `Successfully created ${jobItem.quantity} marketing poster(s)`,
        {
          posterId: posterItem.id,
          imageUrl,
          quantity: jobItem.quantity,
          metadata: posterItem.metadata,
        },
      );
    } catch (e) {
      return gameHelper.function.response.failed(
        `Failed to create poster - ${e}`,
      );
    }
  },
});
