/**
 * localStorage helpers. Every call is wrapped: storage can be blocked or missing (private
 * windows, sandboxed frames), and then a choice lasts for the visit only.
 */
export function readText(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeText(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage blocked: the value lasts this visit */
  }
}

/**
 * Reads an object the story engine saved. The engine's store JSON-encodes a value that its
 * widgets already encoded, so the stored text can be a JSON string holding JSON.
 */
export function readEngineObject(key: string): Record<string, unknown> {
  try {
    let value: unknown = JSON.parse(readText(key) || '{}');
    if (typeof value === 'string') value = JSON.parse(value);
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** Writes an object in the engine's format, so the engine and the tour read each other's data. */
export function writeEngineObject(key: string, value: Record<string, unknown>) {
  writeText(key, JSON.stringify(JSON.stringify(value)));
}
