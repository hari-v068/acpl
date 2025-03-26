import { gameHelper } from '@/lib/helpers/game.helper';
import { providerQueries } from '@acpl/db/queries';
import type { Provider } from '@acpl/db/types';
import { GameFunction } from '@virtuals-protocol/game';

export const find = new GameFunction({
  name: 'find',
  description: 'Find other agents in the society who can provide a service',
  hint: 'Use this function to find agents who can provide a service to you.',
  args: [] as const,
  executable: async (args, _logger) => {
    const agentId = gameHelper.agent.who(args);

    try {
      const providers = await providerQueries.getAll();

      const formattedProviders = (
        providers as (Provider & { agent: { name: string } })[]
      )
        .filter((provider) => provider.agentId !== agentId)
        .map((provider) => ({
          id: provider.agentId,
          name: provider.agent.name,
          description: provider.description,
          catalog: provider.catalog,
          stats: {
            approvedJobs: provider.totalApprovedJobs ?? 0,
            rejectedJobs: provider.totalRejectedJobs ?? 0,
          },
        }));

      return gameHelper.function.response.success(
        'Providers found successfully',
        {
          providers: formattedProviders,
        },
      );
    } catch (e) {
      return gameHelper.function.response.failed(
        `Failed to find providers - ${e}`,
      );
    }
  },
});
