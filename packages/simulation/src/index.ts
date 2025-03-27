import { agentConfigs } from '@/app/agent';
import { serviceHelper } from '@/lib/helpers/service.helper';
import { gameHelper } from '@/lib/helpers/game.helper';
import { agentQueries } from '@acpl/db/queries';

async function main() {
  try {
    console.log('[main] - INITIALIZING AGENTS');

    // Create an array to store agent instances
    const society = [];

    // Process each agent config
    for (const agentConfig of Object.values(agentConfigs)) {
      const agentId = serviceHelper.agent.createDbId(agentConfig.name);
      const existingAgent = await agentQueries.getById(agentId);

      if (existingAgent) {
        console.log(`[main] - RELOADING EXISTING AGENT: ${agentConfig.name}`);
        const gameAgent = gameHelper.agent.create({
          ...agentConfig,
          agentId,
        });

        society.push(gameAgent);
      } else {
        console.log(`[main] - CREATING NEW AGENT: ${agentConfig.name}`);
        const newAgent = await serviceHelper.agent.create({
          ...agentConfig,
          agentId,
        });
        society.push(newAgent);
      }
    }

    await Promise.all(
      society.map(async (agent) => {
        await agent.init();
        console.log(`[main] - ${agent.name} INITIALIZED`);
        console.log('[main] - AGENT INFO');
        console.log(agent.save());
      }),
    );

    // console.log('[main] - RUNNING SOCIETY');
    // for (const { agent } of society) {
    //   await agent.run(5, { verbose: true });
    // }
    while (true) {
      for (const agent of society) {
        try {
          await agent.step({ verbose: true });
          await new Promise((resolve) => setTimeout(resolve, 5000));
        } catch (stepError) {
          console.error(`[main] - Error in ${agent.name}'s step:`, stepError);
          continue;
        }
      }
    }
  } catch (error) {
    console.error('[main] - ERROR RUNNING SOCIETY:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('[main] - ERROR:', error);
    process.exit(1);
  });
}
