# Migration notes: Bokeh server → static single-page app

The Bokeh app (`legacy-python/`: `figure/`, `detail/`, `select-figure/` over
`data/database.db`) is now a React app that runs in the browser, served as
static files. This file records the design decisions, how the results were
checked against the Python app, and where they differ.

## Data for static hosting

Target: Cloudflare Pages. Its limits (developers.cloudflare.com/pages/platform/limits,
checked 2026-11-17): 20,000 files per site on the Free plan (100,000 on
paid plans), 25 MiB per file. Pages compresses responses (gzip/Brotli) and,
without a top-level `404.html`, serves `/index.html` for any path that is
not a file (single-page app mode).

- **No database at runtime.** `database.db` is not needed: the web data is
  generated from `all_complexes.csv` and `structures.tar.gz` by
  `legacy-python/scripts/build_web_data.py`. `import_db.py` and
  `database.db` stay in `legacy-python/` as reference (the fixtures compare
  against `database.db`, see below).
- **Table** (`public/data/table.json.gz`, 527 kB, 1.5 MB uncompressed): only
  the six columns the plot uses (name, X, Y, DeltaE, Reaction, bond_type),
  as columns of a JSON object. Numbers are the CSV text parsed as doubles
  (Python `float()` writes the shortest round-trip representation, so
  `JSON.parse` gives the same double as `parseFloat` of the CSV field).
  Typed arrays were not used: Float64 binary gzips worse than the
  decimal text and Float32 would change the values.
- **Structures**: 25,112 files would exceed the free plan's file count, so
  they are bundled by name prefix: `public/data/structures/<prefix>.json.gz`
  (`Pd_0` holds `Pd_0.0` … `Pd_0.N`), 546 files of 1–71 kB (median 23 kB,
  15 MB in all). Each entry has the CSV row (as text) and the `.xyz` file
  (unchanged), so a complex's page downloads one file of about 23 kB and
  not the table. Sharding by metal only (6 files of 2.4 MB) was rejected as
  too large per page view.
- Files are gzipped at build time (`mtime=0`, reproducible) and gunzipped in
  the browser with `DecompressionStream`, unless the server already
  decoded them (`Content-Encoding: gzip`, as Vite's dev/preview server
  does): the app checks the gzip magic bytes, as oximachinetool does. This
  makes the download size independent of the host's compression.
- `structures.tar.gz` also contains `hs_err_pid16900.log` (a JVM crash log);
  it is not published.
- The whole site: 559 files, 19 MB.

## Plot

- **plotly.js** (`plotly.js-gl2d-dist-min`, the partial bundle with
  `scattergl`; as tgkp uses plotly) draws the 25,112 points with WebGL.
  Bokeh's tools map to Plotly's mode bar: box zoom (default drag), pan,
  wheel zoom, save as PNG, reset.
- **Configuration**: the YAML files stay the source (`src/config/*.yml`,
  copies of `figure/static/*.yml`) and are converted to JSON at build time
  by a ten-line Vite plugin (`vite.config.js`) using the `yaml` package
  (dev dependency only, nothing added to the bundle). A YAML parser in the
  bundle would cost ~30 kB gzipped for no benefit; a JSON copy would be a
  second source of truth. `src/ccgenome/config.js` applies `config.py`'s
  rule (a preset without `clr` gets the Pd preset's colour).
- **Colours**: ΔE uses the 222-colour palette of `figure/main.py` on
  [-80, 30] kcal/mol (Bokeh `LinearColorMapper`, values outside take the end
  colours) as a stepped Plotly colorscale, so the colour bands are those of
  the Bokeh plot (`tests/filters.test.mjs` checks the palette against
  `main.py`). X and Y as colour use Plotly's Viridis over the plotted values
  (Bokeh: Viridis256 over the plotted values).
- **Hover**: name, X, Y and colour quantity with their units, numbers in
  Bokeh's default tooltip format (`%d`, `%0.3f` for 0.1 < |v| < 1000,
  otherwise `%0.3e`; `src/ccgenome/colors.js`).
- **Click** on a point opens `?name=<complex>` in the same tab (Bokeh `OpenURL` used a new one); a "Back" button returns to the plot.
- **Duplicate X/Y/colour** gives the same warning text, listing the doubled
  quantity once (the Python code listed all three by mistake).

### Changed on purpose

- **No Plot button**: filters and axes apply as soon as they change. The
  button existed for the server round trip; filtering 25k rows in the
  browser takes a few milliseconds. The text "Click Plot to update." is
  dropped accordingly.
- **No matches**: the plot is empty and the status says "No matching
  complexes found." (Bokeh plotted a dummy point named "no data" at (0, 0)).
- Labels show `[unit]` only when the unit is not blank ("X" instead of
  "X [ ]").
- The landing page is the same grid of six pictures (now responsive).

## Filters and presets (query.py → JS)

`src/ccgenome/filter.js` reproduces `get_data_sqla` and `load_preset`:

- a range filter applies (SQL `BETWEEN`, inclusive) only when it is not at
  the column's full range; at [-80, 40] complexes with ΔE outside the range
  (207 of them, down to -95.1 and up to 65.5) are shown, as in Bokeh;
- a list filter applies (SQL `IN`) only when not every value is checked; no
  value checked gives no rows (SQLAlchemy's empty `IN`);
- rows stay in table order (SQLite returned them in rowid = CSV order);
- an unknown `?preset=` gives the Pd preset; filters the preset does not
  name are reset to their full range / all values.

`legacy-python/scripts/build_fixtures.py` runs the same SQL (the
`WHERE` clause `query.py` builds) with `sqlite3` for 40 settings: the six
presets, an unknown preset, no filter, 12 hand-picked settings (range ends on
values present in the data, single-value and empty ranges, nothing checked,
combinations) and 20 random settings on the slider's 0.1 grid. It runs them
on two tables:

1. **`csv`**: built from `all_complexes.csv` with Python's `float()`.
   `tests/filters.test.mjs`: the JS rows equal the SQL rows **in all 40
   settings**, and the presets give the filters of `load_preset`.
2. **`shipped`**: `data/database.db`, which the deployed app read. It agrees
   with the CSV **in every setting without a Reaction filter** (also
   tested), but not with one, because the database's Reaction column is
   different (next section).

The fixture script builds its table with the `csv` module, not pandas:
pandas ≥ 2 reads the string `None` (a Reaction value) as missing, so
`import_db.py` run today would store NULL and `Reaction IN ('None')` would
lose those 9,806 rows.

### Floating point

`database.db` was written by pandas 0.24, whose float parser was not
correctly rounded: ΔE differs from the CSV value in the last bit for 4,663
rows (X 7,308, Y 7,163). None of these ΔE values lies on the 0.1 grid of the
slider, so no filter setting can select them differently. The app uses the
correctly rounded values. Bokeh's slider could in principle send values with
floating-point noise (e.g. -23.200000000000003); the app's slider rounds to
one decimal.

## The Reaction column: CSV and database.db disagree

`all_complexes.csv` and `database.db` came in the same commit (`81f54b9`)
and agree on every name, in the same order, and on every column except
**Reaction, which differs for 12,541 of 25,112 complexes**:

| | Suzuki | Kumada | Negishi | Stille | Hiyama | None |
|---|---:|---:|---:|---:|---:|---:|
| CSV | 202 | 4,428 | 2,343 | 4,905 | 3,428 | 9,806 |
| database.db | 1,330 | 8,284 | 1,701 | 3,490 | 2,458 | 7,849 |

Agreement per metal: Ag 4,142/4,186, Cu 2,980/4,185, Au 2,681/4,186,
Pd 1,760/4,185, Pt 830/4,184, Ni 178/4,186. It is not a row shift. In
`database.db` each reaction covers a ΔE window (e.g. Suzuki only between
-32.1 and -23.0), in the CSV other windows (Suzuki -25.9 to -24.3), so they
look like two versions of the reaction assignment. The column names of
`database.db` (`HOMO_Energy`, `Molecular_Weight`, no `*_units` columns)
also show it was built from a different CSV header and an older
`import_db.py` than the ones in the repository.

The web app uses the CSV, as the source of the data. If `database.db` holds
the correct assignment, take its Reaction column in `build_web_data.py`
(the only change) and rerun the scripts. **To be decided by the data
owners.**

## Page of a complex

- **Properties**: the CSV columns with their original headers (which carry
  the units, e.g. "HOMO Energy [eV]") and values as written in the CSV, plus
  `filename`, in CSV order. The Bokeh page showed the database's column
  names (`HOMO_Energy`, no units), sorted alphabetically, with values as
  pandas parsed them (e.g. 65.81326999999999 for 65.81327).
- **Download json**: the same properties (numbers as numbers, other values
  such as `NAN` as text). **Download xyz**: the `.xyz` file (the Bokeh
  button said "Download cif" but downloaded the `.xyz`).
- **3D view**: JSmol is replaced by `src/Detail/MoleculeViewer.jsx`, a small
  three.js component (atoms, bonds, trackball rotation, "Click to interact"
  guard) adapted from alpha-ml's viewer and copied unchanged into
  molecular_data_explorer and molecular-vibration-explorer, so the apps draw
  molecules the same way (TODO in its header: unify it as one
  mc-react-library component). The `.xyz` is read by matsci-parse's
  `fromXYZ`, which puts a molecule in a padded box (`moleculeBox`); the app
  undoes the box shift and gives the viewer the atoms without cell, so no box
  is drawn, as in JSmol. Bonds by distance (below 1.1 × the sum of
  matsci-parse's covalent radii), as JSmol computed its own.
  `mc-react-structure-visualizer` was not used: it always draws the cell
  and offers supercells, which for a molecule means a 20 Å padded box.
  `tests/data.test.mjs` checks that all 25,112 structures read with the
  symbols and positions of their file.
- An unknown name shows "No matching complex found." (Bokeh raised an
  error).

## URLs

One `index.html`; the page is chosen by the query string (`?preset=`,
`?name=`, else the landing page), read with react-router's `useSearchParams`,
so moving between pages keeps the app and its loaded data (no reload). Assets are referenced from
the site root (Vite `base: "/"`), so with Cloudflare Pages' single-page
fallback the old `/figure?preset=Ni` and `/detail?name=Pd_0.10` URLs load the
right page; `/select-figure` gives the landing page. This assumes the app is
served at the root of its domain (the Bokeh app was served under
`BOKEH_PREFIX`).

## Not verified

- The pages were not looked at in a browser (no browser automation was
  allowed for this migration): the build, the dev and preview servers
  (modules and data served, the gzip handling, the SPA fallback) and all the
  logic in `src/ccgenome/` are tested, the rendering of the plot and of the
  3D viewer is not.

## Upstream notes

- For matsci-parse: (1) "the file's Cartesian positions of a molecule"
  (undoing `moleculeBox.origin`) is needed by every viewer of molecules
  (`toWeasAtoms` in matsci-parse's webapp; the viewer here centres the
  molecule, so it doesn't need the shift undone);
  a helper next to `fromXYZ` would remove the copies.
