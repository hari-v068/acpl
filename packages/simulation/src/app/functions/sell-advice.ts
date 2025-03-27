import { gameHelper } from '@/lib/helpers/game.helper';
import { walletQueries } from '@acpl/db/queries';
import { GameFunction } from '@virtuals-protocol/game';

export const sellAdvice = new GameFunction({
  name: 'sell_advice',
  description: 'Sell advice to generate revenue',
  hint: 'Use this when you want to generate some revenue by selling advice',
  args: [
    {
      name: 'quantity',
      type: 'string',
      description: 'Number of advice sessions to sell',
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
      // Get agent's wallet
      const wallet = await walletQueries.getByAgentId(agentId);
      if (!wallet) {
        return gameHelper.function.response.failed('Agent wallet not found');
      }

      // Generate random revenue per advice (between 1-10 units)
      const revenuePerAdvice = Math.floor(Math.random() * 10) + 1;
      const totalRevenue = (revenuePerAdvice * quantity).toFixed(2);

      // Add revenue to wallet
      await walletQueries.addBalance(wallet.id, totalRevenue);

      return gameHelper.function.response.success(
        `Successfully sold ${quantity} advice sessions`,
        {
          revenuePerAdvice,
          totalRevenue,
          walletId: wallet.id,
        },
      );
    } catch (e) {
      return gameHelper.function.response.failed(
        `Failed to sell advice - ${e}`,
      );
    }
  },
});
