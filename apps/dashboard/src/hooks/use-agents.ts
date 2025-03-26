import { useEffect, useState } from 'react';
import { database } from '@/lib/config/firebase';
import { off, onValue, ref } from 'firebase/database';
import type { Agent } from '@acpl/db/types';

/**
 * Custom hook for managing agent data
 * @param connected - Whether Firebase is connected
 * @returns Object containing agents, loading state, and error
 */
export function useAgents(connected: boolean) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!connected) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    console.log('Firebase connected, setting up agents listener');

    const agentsRef = ref(database, 'agents');

    try {
      /* eslint-disable */
      const handleAgentsUpdate = (snapshot: any) => {
        setLoading(false);
        if (snapshot.exists()) {
          const agentsData = snapshot.val();
          const agentsList = Object.values(agentsData) as Agent[];
          console.log('Received agents list:', agentsList);
          setAgents(agentsList);
        } else {
          console.log('No agents available');
          setAgents([]);
        }
      };

      const handleError = (err: Error) => {
        console.error('Error fetching agents:', err);
        setError(err);
        setLoading(false);
      };

      // Set up event listener
      onValue(agentsRef, handleAgentsUpdate, handleError);

      return () => {
        off(agentsRef, 'value');
      };
    } catch (err) {
      console.error('Error setting up agents listener:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      setLoading(false);
    }
  }, [connected]);

  return { agents, loading, error };
}
