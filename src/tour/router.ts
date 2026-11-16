import { useEffect, useState } from 'react';
import { STOPS } from './data';

export type Route = { kind: 'welcome' } | { kind: 'stop'; index: number } | { kind: 'sources' };

/**
 * Reads a hash into a screen. #/ is the departure screen, #/<stop id> a stop and #/sources the
 * source list. Anchors from the old one-page guide (#top, #arrive, #sources) still land.
 */
export function parseHash(hash: string): Route {
  let id = hash.replace(/^#\/?/, '');
  try {
    id = decodeURIComponent(id);
  } catch {
    /* a malformed escape: use the raw text */
  }
  id = id.toLowerCase();
  if (id === 'sources') return { kind: 'sources' };
  const index = STOPS.findIndex((s) => s.id === id);
  return index >= 0 ? { kind: 'stop', index } : { kind: 'welcome' };
}

export const welcomeHref = '#/';
export const sourcesHref = '#/sources';
export const stopHref = (index: number) => `#/${STOPS[index].id}`;

export function sameRoute(a: Route, b: Route) {
  if (a.kind !== b.kind) return false;
  return a.kind !== 'stop' || a.index === (b as { index: number }).index;
}

/** The current screen, following hash changes (links, back and forward). */
export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));
  useEffect(() => {
    const onHash = () =>
      setRoute((prev) => {
        const next = parseHash(window.location.hash);
        return sameRoute(prev, next) ? prev : next;
      });
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  return route;
}

export function go(href: string) {
  if (window.location.hash !== href) window.location.hash = href;
}
