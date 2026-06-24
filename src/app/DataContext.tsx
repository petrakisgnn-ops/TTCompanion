import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { needsIngest, runIngest, type IngestProgress } from '../data/ingest';

interface DataState {
  ready: boolean;
  progress: IngestProgress | null;
  error: string | null;
}

const DataContext = createContext<DataState>({ ready: false, progress: null, error: null });

export function useData(): DataState {
  return useContext(DataContext);
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DataState>({ ready: false, progress: null, error: null });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const needed = await needsIngest();
        if (!needed) {
          if (!cancelled) setState({ ready: true, progress: null, error: null });
          return;
        }

        await runIngest((progress) => {
          if (!cancelled) setState({ ready: false, progress, error: null });
        });

        if (!cancelled) setState({ ready: true, progress: null, error: null });
      } catch (err) {
        if (!cancelled)
          setState({ ready: false, progress: null, error: String(err) });
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return <DataContext.Provider value={state}>{children}</DataContext.Provider>;
}
