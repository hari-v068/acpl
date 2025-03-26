import { database } from '@/lib/config/firebase';
import type { Log } from '@acpl/types';
import { useEffect, useState } from 'react';
import {
  endAt,
  get,
  limitToLast,
  off,
  onValue,
  orderByChild,
  query,
  ref,
  update,
} from 'firebase/database';

// Global store for logs to persist across tab switches
const logStore: Record<string, Log[]> = {};

/**
 * Custom hook for managing agent logs
 * @param connected - Whether Firebase is connected
 * @param agentId - ID of the agent to get logs for
 * @param limit - Maximum number of logs to retrieve
 * @returns Object containing logs, loading state, and error
 */
export function useLogs(connected: boolean, agentId: string, limit = 30) {
  // Initialize state from the global store
  const [logs, setLogs] = useState<Log[]>(logStore[agentId] || []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!connected || !agentId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Initialize the agent's log store if it doesn't exist
    if (!logStore[agentId]) {
      logStore[agentId] = [];
    }

    console.log(`Setting up logs listener for agent: ${agentId}`);

    try {
      // Create a query to get the last 'limit' logs
      // Reduced from 100 to 30 to focus on more recent logs
      const logsRef = query(
        ref(database, `agent_logs/${agentId}`),
        orderByChild('timestamp'),
        limitToLast(limit),
      );

      /* eslint-disable */
      const handleLogsUpdate = (snapshot: any) => {
        setLoading(false);
        if (snapshot.exists()) {
          const logsData = snapshot.val();
          // Convert object to array and sort by timestamp
          const logsList = Object.values(logsData) as Log[];

          try {
            // More robust sorting with error handling
            logsList.sort((a, b) => {
              try {
                return (
                  new Date(a.timestamp).getTime() -
                  new Date(b.timestamp).getTime()
                );
              } catch (err) {
                console.warn('Error sorting logs by timestamp:', err);
                return 0; // Keep original order if dates can't be compared
              }
            });

            console.log(
              `Received ${logsList.length} logs for agent ${agentId}`,
            );

            // Update both the local state and the global store
            logStore[agentId] = logsList;
            setLogs(logsList);
          } catch (sortErr) {
            console.error('Error processing logs:', sortErr);
            setError(
              sortErr instanceof Error ? sortErr : new Error(String(sortErr)),
            );
          }
        } else {
          console.log(`No logs available for agent ${agentId}`);
          logStore[agentId] = [];
          setLogs([]);
        }
      };

      const handleError = (err: Error) => {
        console.error(`Error fetching logs for agent ${agentId}:`, err);
        setError(err);
        setLoading(false);
      };

      // Set up event listener
      onValue(logsRef, handleLogsUpdate, handleError);

      return () => {
        off(logsRef, 'value');
      };
    } catch (err) {
      console.error(
        `Error setting up logs listener for agent ${agentId}:`,
        err,
      );
      setError(err instanceof Error ? err : new Error(String(err)));
      setLoading(false);
    }
  }, [connected, agentId, limit]);

  return { logs, loading, error };
}

/**
 * Get logs for all agents
 * @returns Record of agent IDs to log arrays
 */
export function getAllAgentLogs() {
  return logStore;
}

/**
 * Clear logs for a specific agent
 * @param agentId - ID of the agent to clear logs for
 */
export function clearAgentLogs(agentId: string) {
  if (logStore[agentId]) {
    logStore[agentId] = [];
  }
}

/**
 * Clear all logs for all agents
 */
export function clearAllLogs() {
  Object.keys(logStore).forEach((key) => {
    logStore[key] = [];
  });
}

/**
 * Clean up old logs from Firebase
 * @param agentId - ID of the agent to clean logs for, or undefined for all agents
 * @param olderThan - Delete logs older than this many milliseconds (default: 24 hours)
 * @returns Promise that resolves when cleanup is complete
 */
export async function cleanupOldLogs(
  agentId?: string,
  olderThan = 24 * 60 * 60 * 1000,
) {
  try {
    // Convert current time to ISO string for comparison with stored timestamps
    const cutoffDate = new Date(Date.now() - olderThan);
    const cutoffTimestamp = cutoffDate.toISOString();

    console.log(`Cleaning up logs older than ${cutoffDate.toLocaleString()}`);

    // If agentId is provided, clean only that agent's logs
    if (agentId) {
      await cleanupAgentLogs(agentId, cutoffTimestamp);
    } else {
      // Get all agent IDs
      const agentsRef = ref(database, 'agents');
      const agentsSnapshot = await get(agentsRef);

      if (agentsSnapshot.exists()) {
        const agents = Object.keys(agentsSnapshot.val());
        console.log(`Cleaning up logs for ${agents.length} agents`);

        // Clean logs for each agent
        for (const id of agents) {
          await cleanupAgentLogs(id, cutoffTimestamp);
        }
      }
    }

    console.log('Log cleanup completed successfully');
    return true;
  } catch (error) {
    console.error('Error cleaning up logs:', error);
    return false;
  }
}

/**
 * Helper function to clean up logs for a specific agent
 * @param agentId - ID of the agent to clean logs for
 * @param cutoffTimestamp - ISO timestamp string to use as cutoff
 */
async function cleanupAgentLogs(agentId: string, cutoffTimestamp: string) {
  // Query for logs older than the cutoff
  const logsRef = ref(database, `agent_logs/${agentId}`);
  const oldLogsQuery = query(
    logsRef,
    orderByChild('timestamp'),
    endAt(cutoffTimestamp),
  );

  const snapshot = await get(oldLogsQuery);

  if (snapshot.exists()) {
    const updates: Record<string, null> = {};
    let count = 0;

    // Mark each old log for deletion
    snapshot.forEach((childSnapshot) => {
      updates[childSnapshot.key as string] = null;
      count++;
    });

    if (count > 0) {
      console.log(`Deleting ${count} old logs for agent ${agentId}`);
      await update(logsRef, updates);
    } else {
      console.log(`No old logs to delete for agent ${agentId}`);
    }
  }
}
