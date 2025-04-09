'use client';

import { AgentCard } from '@/components/agent-card';
import { ConnectionState } from '@/components/ui/connection-state';
import { useAgents } from '@/hooks/use-agents';
import { useFirebase } from '@/hooks/use-firebase';
import type { Agent } from '@acpl/db/types';
import { useEffect, useState } from 'react';

export default function Home() {
  const [isLogoVisible, setIsLogoVisible] = useState(true);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const { connected, error: connectionError } = useFirebase();
  const { agents, loading, error: agentsError } = useAgents(connected);

  useEffect(() => {
    // Hide logo after 2 seconds
    const timer = setTimeout(() => {
      setIsLogoVisible(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Show initial logo animation
  if (isLogoVisible) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-8">
        <div className="text-center">
          <h1 className="font-syne font-black text-4xl mb-2 animate-pulse">
            ACP
            <span className="font-mono text-sm text-muted-foreground ml-2 align-top">
              lite
            </span>
          </h1>
        </div>
      </div>
    );
  }

  // Handle connection states, loading, errors, and empty data
  const connectionState = (
    <ConnectionState
      isConnected={connected}
      isLoading={loading}
      connectionError={connectionError}
      dataError={agentsError}
      isEmpty={agents.length === 0}
      emptyMessage="No active agents are currently available. Start an agent to see it here."
    />
  );

  if (
    connectionError ||
    !connected ||
    loading ||
    agentsError ||
    agents.length === 0
  ) {
    return connectionState;
  }

  const handleAgentToggle = (agentId: string) => {
    setSelectedAgents((prev) =>
      prev.includes(agentId)
        ? prev.filter((id) => id !== agentId)
        : [...prev, agentId],
    );
  };

  // Filter agents based on selection
  const agentsToDisplay: Agent[] =
    selectedAgents.length > 0
      ? agents.filter((agent) => selectedAgents.includes(agent.id))
      : agents;

  return (
    <div className="flex items-center justify-center p-20">
      <div className="w-full flex flex-col space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSelectedAgents([])}
            className={`px-4 py-2 rounded-md transition-all ${
              selectedAgents.length === 0
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary hover:bg-secondary/80'
            }`}
          >
            All Agents ({agents.length})
          </button>

          <div className="flex flex-wrap gap-2 justify-end">
            {agents.map((agent) => (
              <button
                key={agent.id}
                onClick={() => handleAgentToggle(agent.id)}
                className={`px-4 py-2 rounded-md transition-all flex items-center gap-2 ${
                  selectedAgents.includes(agent.id)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary hover:bg-secondary/80'
                }`}
              >
                {agent.name}
                {selectedAgents.includes(agent.id) && (
                  <span className="text-xs">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div
          className={`grid gap-6 ${
            agentsToDisplay.length === 1
              ? 'grid-cols-1'
              : agentsToDisplay.length === 2
                ? 'grid-cols-1 md:grid-cols-2'
                : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
          }`}
        >
          {agentsToDisplay.map((agent) => (
            <AgentCard key={agent.id} agent={agent} connected={connected} />
          ))}
        </div>
      </div>
    </div>
  );
}
