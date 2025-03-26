/* eslint-disable */

import { useEffect, useState } from 'react';
import { database } from '@/lib/config/firebase';
import { off, onValue, ref } from 'firebase/database';

interface AgentStatus {
  agent_state?: { data: any; timestamp: string };
  action_state?: { data: any; timestamp: string };
  function_execution?: { data: any; timestamp: string };
  function_status?: { data: any; timestamp: string };
  worker_navigation?: { data: any; timestamp: string };
  no_actions?: { data: any; timestamp: string };
  lastUpdated?: string;
}

export function useAgentStatus(connected: boolean, agentId: string) {
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!connected || !agentId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const statusRef = ref(database, `agent_status/${agentId}`);

    try {
      const handleStatusUpdate = (snapshot: any) => {
        setLoading(false);
        if (snapshot.exists()) {
          const statusData = snapshot.val();
          setAgentStatus(statusData);
        } else {
          setAgentStatus(null);
        }
      };

      const handleError = (err: Error) => {
        console.error(`Error fetching agent status for ${agentId}:`, err);
        setError(err);
        setLoading(false);
      };

      // Set up event listener
      onValue(statusRef, handleStatusUpdate, handleError);

      return () => {
        off(statusRef, 'value');
      };
    } catch (err) {
      console.error(
        `Error setting up agent status listener for ${agentId}:`,
        err,
      );
      setError(err instanceof Error ? err : new Error(String(err)));
      setLoading(false);
    }
  }, [connected, agentId]);

  return { agentStatus, loading, error };
}
