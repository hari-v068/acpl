import { database } from '@/lib/config/firebase';
import { off, onValue, ref } from 'firebase/database';
import { useEffect, useState } from 'react';

export function useFirebase() {
  const [connected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const connectedRef = ref(database, '.info/connected');

    try {
      /* eslint-disable */
      const handleConnection = (snap: any) => {
        setIsConnected(!!snap.val());
        if (snap.val() === true) {
          console.log('CONNECTED TO FIREBASE');
          setError(null);
        } else {
          console.log('DISCONNECTED FROM FIREBASE');
        }
      };

      const handleError = (err: Error) => {
        console.error('Firebase connection error:', err);
        setError(err);
        setIsConnected(false);
      };

      // Set up connection listener
      onValue(connectedRef, handleConnection, handleError);

      return () => {
        off(connectedRef, 'value');
      };
    } catch (err) {
      console.error('Error setting up Firebase connection:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      setIsConnected(false);
    }
  }, []);

  return { database, connected, error };
}
