// The data the app downloads (public/data/, written by
// legacy-python/scripts/build_web_data.py).

/** File of public/data/structures/ holding a complex: Pd_0.10 -> Pd_0. */
export function shardOf(name) {
  return name.split(".")[0];
}

/** Text of gzip-compressed bytes (or of plain bytes: servers may already have
 * decompressed a .gz file, e.g. Vite's dev server with Content-Encoding). */
export async function gunzipText(blob) {
  const magic = new Uint8Array(await blob.slice(0, 2).arrayBuffer());
  if (magic[0] !== 0x1f || magic[1] !== 0x8b) return blob.text();
  return new Response(blob.stream().pipeThrough(new DecompressionStream("gzip"))).text();
}

async function fetchJsonGz(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not download ${url} (HTTP ${res.status})`);
  return JSON.parse(await gunzipText(await res.blob()));
}

/** The plot table: { name, X, Y, DeltaE, Reaction, bond_type }, one array per column. */
export function fetchTable(base) {
  return fetchJsonGz(`${base}data/table.json.gz`);
}

/**
 * One complex: { columns: CSV header, row: CSV fields, xyz: text }, or null
 * if there is no complex of that name.
 */
export async function fetchComplex(base, name) {
  const shard = shardOf(name);
  // Names are <metal>_<n>.<m>; anything else cannot be in a file
  if (!/^[A-Za-z]+_\d+$/.test(shard)) return null;
  const res = await fetch(`${base}data/structures/${shard}.json.gz`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Could not download the structure (HTTP ${res.status})`);
  const text = await gunzipText(await res.blob());
  // A static host may answer an unknown path with the app's index.html
  if (!text.startsWith("{")) return null;
  const { columns, complexes } = JSON.parse(text);
  const entry = complexes[name];
  return entry ? { columns, ...entry } : null;
}

/**
 * The properties of a complex as a JSON object (the "Download json" file):
 * CSV header -> value, numbers as numbers, other fields (e.g. "NAN") as text.
 */
export function propertiesJson(columns, row) {
  return Object.fromEntries(
    columns.map((c, i) => {
      const v = row[i];
      const x = Number(v);
      return [c, v.trim() !== "" && Number.isFinite(x) ? x : v];
    }),
  );
}
