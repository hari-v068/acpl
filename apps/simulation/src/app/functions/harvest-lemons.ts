import { gameHelper } from '@/lib/helpers/game.helper';
import { inventoryItemQueries, itemQueries } from '@acpl/db/queries';
import { GameFunction } from '@virtuals-protocol/game';

export const harvestLemons = new GameFunction({
  name: 'harvest_lemons',
  description: 'Harvest fresh lemons from the farm',
  hint: 'Use this when you want to harvest lemons from the farm or when you need to replenish your inventor to sell lemons.',
  args: [
    {
      name: 'quantity',
      type: 'string',
      description: 'Number of lemons to harvest',
    },
  ] as const,
  executable: async (args, _logger) => {
    const agentId = gameHelper.function.who(args);
    const quantity = Number(args.quantity);

    if (!quantity || quantity <= 0 || !Number.isInteger(quantity)) {
      return gameHelper.function.response.failed(
        'Quantity must be a positive integer',
      );
    }

    try {
      // Get agent-specific lemon item
      const lemonItemId = `item-lemon-${agentId}`;
      const existingLemonItem = await itemQueries.getById(lemonItemId);

      // Create the item if it doesn't exist
      const lemonItem =
        existingLemonItem ??
        (await itemQueries.create({
          id: lemonItemId,
          agentId,
          name: 'Lemon',
          metadata: {
            itemType: 'PHYSICAL',
            description: 'Fresh lemons from the farm',
            origin: "Zestie's Farm",
          },
        }));

      // Check if agent already has lemons in inventory
      const existingInventoryItem =
        await inventoryItemQueries.getByAgentAndItemId(agentId, lemonItem.id);

      if (existingInventoryItem) {
        // Add to existing inventory
        await inventoryItemQueries.addQuantity(
          existingInventoryItem.id,
          quantity,
        );
      } else {
        // Create new inventory entry
        await inventoryItemQueries.create({
          id: `inventory-lemon-${agentId}-${Date.now()}`,
          agentId,
          itemId: lemonItem.id,
          quantity,
        });
      }

      return gameHelper.function.response.success(
        `Successfully harvested ${quantity} lemons`,
        {
          itemId: lemonItem.id,
          quantity,
          metadata: lemonItem.metadata,
        },
      );
    } catch (e) {
      return gameHelper.function.response.failed(
        `Failed to harvest lemons - ${e}`,
      );
    }
  },
});
