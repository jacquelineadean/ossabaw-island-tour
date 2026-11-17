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
  /** cross: the boat's run across the water; fly: gulls crossing with a flutter; drift: bobbing in place. */
  motion: 'cross' | 'fly' | 'drift';
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

/** x0, y0, x1, y1 in map pixels. */
type Region = [number, number, number, number];

/** How a map's painting ends: its edges fade into the surround, a soft copy of its edge colors. */
type MapEdges = {
  /** Map pixels along each edge that are not fully opaque; the camera keeps them off screen when it can. */
  fade: number;
  /** Map pixels along each edge that are fully transparent (a vignette or torn paper). */
  fadeFrom: number;
  /** The surround image, made by scripts/map-surround.py. */
  surround: string;
  /** The stage's color past the surround, on very wide screens: the surround's east edge. */
  sea: string;
};

type PaintedMapData = MapEdges & {
  img: string;
  w: number;
  h: number;
  /** Every stop and pin with a margin: what the island view frames. */
  region: Region;
  /** How many map pixels of height a stop's close view shows. */
  closeSpan: number;
  layers: MapLayer[];
  labels: MapLabel[];
};

/** The holiday card's map: its own picture, frame and positions for the stops and pins. */
type CardMapData = MapEdges & {
  img: string;
  srcSet: string;
  w: number;
  h: number;
  region: Region;
  closeSpan: number;
  alt: string;
  /** Stop positions by stop id, pin positions by pin title. */
  stops: Record<string, Point>;
  pins: Record<string, Point>;
  /** Stops whose label sits left of the badge. */
  labelLeft: string[];
};

type TourData = {
  title: string;
  map: PaintedMapData;
  cardMap: CardMapData;
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

/** The surround reaches this many map widths past the left and right edges, and heights past the top and bottom. */
export const SURROUND_X = 1;
export const SURROUND_Y = 0.75;

/** One map the stage can show, with every position in its own pixels. */
export type MapSpec = MapEdges & {
  id: 'painted' | 'card';
  img: string;
  srcSet?: string;
  w: number;
  h: number;
  alt: string;
  region: { x0: number; y0: number; x1: number; y1: number };
  closeSpan: number;
  layers: MapLayer[];
  labels: MapLabel[];
  /** Stop positions in STOPS order, pin positions in TOUR.pins order. */
  stops: Point[];
  pins: Point[];
  /** Per stop: true when its label sits left of the badge. */
  labelLeft: boolean[];
  /** The painted map draws the route between stops; the card map has its own lights on the road. */
  route: boolean;
  /** The card map carries the card's animals. */
  animals: boolean;
};

const region = ([x0, y0, x1, y1]: Region) => ({ x0, y0, x1, y1 });

/** The tour's own watercolor map. */
export const PAINTED_MAP: MapSpec = {
  id: 'painted',
  img: MAP.img,
  w: MAP.w,
  h: MAP.h,
  alt: 'Painted map of Ossabaw Island, with Ossabaw Sound to the north, the Atlantic to the east and St. Catherines Sound to the south.',
  region: region(MAP.region),
  closeSpan: MAP.closeSpan,
  // The painted map ends in torn paper edges; they fade out, and the surround carries the sea on.
  fade: MAP.fade,
  fadeFrom: MAP.fadeFrom,
  surround: MAP.surround,
  sea: MAP.sea,
  layers: MAP.layers,
  labels: MAP.labels,
  stops: STOPS.map((s) => s.at),
  pins: TOUR.pins.map((p) => p.at),
  labelLeft: STOPS.map((s) => s.at[0] > MAP.w * 0.7),
  route: true,
  animals: false,
};

const CM = TOUR.cardMap;
const cardAt = (table: Record<string, Point>, key: string): Point => {
  const at = table[key];
  if (!at) throw new Error(`The card map has no position for ${key}`);
  return at;
};

/** The holiday card's map, shown while the holiday theme is on. */
export const CARD_MAP: MapSpec = {
  id: 'card',
  img: CM.img,
  srcSet: CM.srcSet,
  w: CM.w,
  h: CM.h,
  alt: CM.alt,
  region: region(CM.region),
  closeSpan: CM.closeSpan,
  fade: CM.fade,
  fadeFrom: CM.fadeFrom,
  surround: CM.surround,
  sea: CM.sea,
  layers: [],
  labels: [],
  stops: STOPS.map((s) => cardAt(CM.stops, s.id)),
  pins: TOUR.pins.map((p) => cardAt(CM.pins, p.title)),
  labelLeft: STOPS.map((s) => CM.labelLeft.includes(s.id)),
  route: false,
  animals: true,
};

export const stopNumber = (i: number) => String(i + 1).padStart(2, '0');

/** The Ossabaw Island Foundation's website, printed on the holiday card's back. */
export const FOUNDATION_URL = 'https://ossabawisland.org';
