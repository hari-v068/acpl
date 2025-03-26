import type { GameFunction } from '@virtuals-protocol/game';

export interface GameFunctionArg {
  name: string;
  description: string;
  type?: string;
  optional?: boolean;
}

export type WorkerConfig = {
  id: string;
  name: string;
  description: string;
  functions: GameFunction<GameFunctionArg[]>[];
};

export type WorkerConfigs = Record<string, WorkerConfig>;

export type AgentConfig = {
  name: string;
  goal: string;
  description: string;
  workers?: WorkerConfig[];
  walletAddress: string;
  providerDescription?: string;
  providerCatalog?: { product: string; price: number }[];
};

export type AgentConfigs = Record<string, AgentConfig>;
