import { useCallback, useEffect, useState } from 'react';
import { readEngineObject, readText, writeEngineObject, writeText } from './storage';

/** The keys the old map tour used, so a returning reader keeps their passport stamps. */
const VISITED_KEY = 'ossabaw-tour-visited';
const LAST_KEY = 'ossabaw-tour-last';

export type Visited = Record<string, number>;

/** Stops the reader has opened, by stop id, kept across visits. */
export function useVisited() {
  const [visited, setVisited] = useState<Visited>(() => readEngineObject(VISITED_KEY) as Visited);
  const mark = useCallback((id: string) => {
    setVisited((was) => (was[id] ? was : { ...was, [id]: 1 }));
    writeText(LAST_KEY, id);
  }, []);
  useEffect(() => writeEngineObject(VISITED_KEY, visited), [visited]);
  return { visited, mark };
}

/** The stop the reader last opened, for "continue the tour". */
export function lastStopId() {
  return readText(LAST_KEY);
}
