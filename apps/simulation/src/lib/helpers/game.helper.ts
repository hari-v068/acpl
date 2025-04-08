import { serviceHelper } from '@/lib/helpers/service.helper';
import { agentInstructions } from '@/lib/instructions';
import type { AgentConfig, GameFunctionArg, WorkerConfig } from '@/lib/types';
import {
  ensureLogDirectory,
  getAgentLogFilePath,
  parseLog,
  writeLogToFile,
} from '@/lib/utils/log.utils';
import { env } from '@acpl/config/env';
import type { Log } from '@acpl/types';
import {
  ExecutableGameFunctionResponse,
  ExecutableGameFunctionStatus,
  GameAgent,
  GameFunction,
  GameWorker,
} from '@virtuals-protocol/game';

export const gameHelper = {
  agent: {
    create: (agentConfig: AgentConfig & { agentId: string }) => {
      // Register the agent with complete details
      fetch(`${env.FIREBASE_URL}/agents/${agentConfig.agentId}.json`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: agentConfig.agentId,
          name: agentConfig.name,
          goal: agentConfig.goal,
          description: agentConfig.description,
        }),
      }).catch((e) => console.error(`Failed to register agent - ${e}`));

      const agent = new GameAgent(env.GAME_API_KEY, {
        ...agentConfig,
        workers:
          agentConfig.workers?.map((workerConfig: WorkerConfig) =>
            gameHelper.worker.create(workerConfig, agentConfig.agentId),
          ) ?? [],
        getAgentState: async () => {
          return await serviceHelper.agent.getState(agentConfig.agentId);
        },
      });

      agent.setLogger(async (_agent: GameAgent, msg: string) => {
        try {
          // FILE
          await ensureLogDirectory();
          const timestamp = new Date().toISOString();
          const logEntry = `${timestamp} - ${msg}\n`;
          const logFilePath = getAgentLogFilePath(agent.name);
          await writeLogToFile(logFilePath, logEntry);

          // FIREBASE
          const parsedLog = parseLog(msg);
          if (parsedLog) {
            const log: Log = {
              ...parsedLog,
              agentId: agentConfig.agentId,
              timestamp,
            };

            await fetch(
              `${env.FIREBASE_URL}/agent_status/${agentConfig.agentId}/${log.type.toLowerCase()}.json`,
              {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  data: log.data,
                  timestamp,
                }),
              },
            ).catch((e) =>
              console.error(`Failed to update agent status - ${e}`),
            );

            await fetch(
              `${env.FIREBASE_URL}/agent_status/${agentConfig.agentId}/lastUpdated.json`,
              {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(timestamp),
              },
            ).catch((e) =>
              console.error(`Failed to update last updated timestamp - ${e}`),
            );

            await fetch(
              `${env.FIREBASE_URL}/agent_logs/${agentConfig.agentId}.json`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(log),
              },
            ).catch((e) => console.error(`Failed to add log - ${e}`));
          }
        } catch (e) {
          console.error(`Failed to process log - ${e}`);
        }
      });

      return agent;
    },
  },

  worker: {
    create: (config: WorkerConfig, agentId: string) => {
      return new GameWorker({
        ...config,
        functions: config.functions.map((func) =>
          gameHelper.function.create(func, agentId),
        ),
        getEnvironment: async () => {
          const state = await serviceHelper.agent.getState(agentId);

          return {
            ...state,
            instructions: {
              description:
                'ACP (Agent-Commerce-Protocol) Worker Function Flow Guide',
              flows: {
                client: agentInstructions.clientFlow,
                provider: agentInstructions.providerFlow,
                evaluator: agentInstructions.evaluatorFlow,
                activeJob: agentInstructions.activeJobFlow,
              },
              rules: agentInstructions.rules,
              phaseFlow:
                'REQUEST → NEGOTIATION → TRANSACTION → EVALUATION → COMPLETE',
            },
          };
        },
      });
    },
  },

  function: {
    create: (
      baseFunction: GameFunction<GameFunctionArg[]>,
      agentId: string,
    ): GameFunction<GameFunctionArg[]> => {
      return new GameFunction({
        name: baseFunction.name,
        description: baseFunction.description,
        hint: baseFunction.hint,
        args: baseFunction.args,
        executable: async (args, logger) => {
          return await baseFunction.executable({ ...args, agentId }, logger);
        },
      });
    },

    response: {
      success: (message: string, metadata?: Record<string, unknown>) => {
        return new ExecutableGameFunctionResponse(
          ExecutableGameFunctionStatus.Done,
          JSON.stringify({ message, metadata }),
        );
      },
      failed: (message: string, metadata?: Record<string, unknown>) => {
        return new ExecutableGameFunctionResponse(
          ExecutableGameFunctionStatus.Failed,
          JSON.stringify({ message, metadata }),
        );
      },
    },

    /**
     * Gets the ID of the agent currently executing the function
     * @param args The function arguments passed by the game engine
     * @returns The agent ID string
     */
    who: <T>(args: T): string => {
      return (args as T & { agentId: string }).agentId;
    },
  },
};
