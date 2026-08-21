/**
 * D1 access.
 *
 * Returns null when there is no binding — which is the case under plain
 * `next dev` or `next start`. Callers fall back to the seed JSON, so the
 * storefront runs and can be tested without a database attached.
 */
export type D1 = {
  prepare(query: string): {
    bind(...values: unknown[]): {
      all<T = unknown>(): Promise<{ results: T[] }>;
      first<T = unknown>(): Promise<T | null>;
      run(): Promise<unknown>;
    };
    all<T = unknown>(): Promise<{ results: T[] }>;
    first<T = unknown>(): Promise<T | null>;
    run(): Promise<unknown>;
  };
  batch(statements: unknown[]): Promise<unknown>;
};

export async function getDb(): Promise<D1 | null> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const ctx = await getCloudflareContext({ async: true });
    const db = (ctx.env as unknown as Record<string, unknown>).DB;
    return (db as D1) ?? null;
  } catch {
    return null;
  }
}

/** True when the catalogue is being served from D1 rather than the seed file. */
export async function dbAvailable(): Promise<boolean> {
  return (await getDb()) !== null;
}
