import { useEffect, useState, useCallback } from 'react';
import { database } from '@/lib/config/firebase';
import { off, onValue, ref, DataSnapshot } from 'firebase/database';
import type { AgentState } from '@acpl/types';

export function useAgentState(agentId: string) {
  const [state, setState] = useState<AgentState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchState = useCallback(async () => {
    try {
      const response = await fetch(`/api/agents/${agentId}/state`);
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setState(data.state);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    if (!agentId) {
      setLoading(false);
      return;
    }

    // Initial fetch
    fetchState();

    // Listen for function status updates
    const statusRef = ref(database, `agent_status/${agentId}/function_status`);

    const handleStatusUpdate = (snapshot: DataSnapshot) => {
      if (snapshot.exists() && snapshot.val().data?.status === 'done') {
        fetchState();
      }
    };

    const handleError = (err: Error) => {
      console.error(`Error listening to function status for ${agentId}:`, err);
      setError(err);
    };

    onValue(statusRef, handleStatusUpdate, handleError);
    return () => off(statusRef, 'value');
  }, [agentId, fetchState]);

  return { state, loading, error, refetch: fetchState };
}
