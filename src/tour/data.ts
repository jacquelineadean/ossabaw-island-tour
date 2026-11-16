import tour from './tour.json';

export type Point = [number, number];

export type Stop = {
  /** Also the id of the stop's chapter section and its hash route (#/arrive). */
  id: string;
  /** The place, as the map and the trail name it. */
  title: string;
  /** A short name for map labels and buttons. */
  short: string;
  /** Position on the painted map, in map pixels. */
  at: Point;
  icon: string;
  /** One or two sentences that introduce the stop. */
  intro: string;
};

export type MapLayer = {
  src: string;
  /** x, y, width, height in map pixels. */
  box: [number, number, number, number];
  motion: 'cross' | 'drift';
  travel: number;
  blend: string;
};

export type MapLabel = {
  x: number;
  y: number;
  text: string;
  size: number;
  anchor: 'start' | 'middle' | 'end';
  angle: number;
  style: string;
  color: string;
  /** "title" marks the island's name, which the island view hides where the departure panel covers it. */
  role?: 'title';
};

export type Pin = { title: string; at: Point; text: string };

export type Species = { id: string; name: string };

type TourData = {
  title: string;
  map: { img: string; w: number; h: number; layers: MapLayer[]; labels: MapLabel[] };
  icons: Record<string, string>;
  stops: Stop[];
  pins: Pin[];
  species: Species[];
  /** localStorage key the habitat widgets write spotted animals to. */
  journal: string;
};

// JSON imports type arrays as number[] and strings as string; the types above are the real shape.
export const TOUR = tour as unknown as TourData;
export const STOPS = TOUR.stops;
export const MAP = TOUR.map;
export const ICONS = TOUR.icons;

export const stopNumber = (i: number) => String(i + 1).padStart(2, '0');
