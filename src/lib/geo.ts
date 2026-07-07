/**
 * Reverse-geocode browser GPS coordinates to a U.S. state name.
 * Uses the free FCC Census Block API (no key, CORS-open). Returns the proper-case
 * state name (e.g. "Georgia") matching the CDC NNDSS location values.
 */
export async function coordsToState(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://geo.fcc.gov/api/census/block/find?latitude=${lat}&longitude=${lng}&showall=false&format=json`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.State?.name ?? null;
  } catch {
    return null;
  }
}
