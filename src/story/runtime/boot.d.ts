/** Helpers the engine hands to every widget (DOM builders, formatters, storage, tooltip). */
export type Kit = Record<string, unknown>;

/** A widget builds its own DOM inside `root` from its entry in chronicle.json. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Widget = (root: HTMLElement, data: any, kit: any) => unknown;

export function boot(data: unknown, widgets: Record<string, Widget>): void;
