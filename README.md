# C-C Cross-Coupling Genome (CCGenome)

Interactive map of 25,112 cross-coupling catalyst complexes (Pd, Pt, Cu, Ni,
Au and Ag): a scatter plot of the complexes, which can be coloured, filtered
by metal, reaction and descriptor (ΔE), and a page per complex with its 3D
structure and properties.

The app is a static single-page app: everything runs in the browser, there is
no server at runtime. It was a Bokeh server app over an SQLite database; what
changed and how the results were checked against it is in
[MIGRATION_NOTES.md](MIGRATION_NOTES.md).

## Pages

The page is chosen by the query string (the old Bokeh paths in brackets):

| URL | page |
|---|---|
| `/` | choice of figure, one per metal (`/select-figure`) |
| `/?preset=Ni` | scatter plot with a preset of `src/config/presets.yml` (`/figure?preset=Ni`) |
| `/?name=Pd_0.10` | one complex: 3D view, properties, downloads (`/detail?name=Pd_0.10`) |

On a host that serves `index.html` for unknown paths (Cloudflare Pages
without a `404.html`), the old URLs `/figure?preset=…` and `/detail?name=…`
keep working.

## Code

- `src/App.jsx`: header and choice of page; `src/Landing.jsx`, `src/Figure/`
  (controls, plot with plotly.js scattergl), `src/Detail/` (properties,
  molecule viewer: a small three.js component shared with alpha-ml,
  molecular_data_explorer and molecular-vibration-explorer).
- `src/ccgenome/`: the logic, without React (tested in Node): presets and
  filters (`filter.js`), colours and tooltip number format (`colors.js`), data
  loading (`data.js`). The molecule viewer takes the
  [matsci-parse](https://www.npmjs.com/package/matsci-parse) structure of the
  .xyz file (`fromXYZ`) directly.
- `src/config/*.yml`: the plot configuration, as in the Bokeh app:
  `columns.yml` (the quantities), `filters.yml` (the filters shown),
  `presets.yml` (axes, colour and filters of each preset). They are converted
  to JSON at build time (`vite.config.js`).
- `public/data/`: the data the app downloads (generated, see below).
- `legacy-python/`: the Bokeh app, the raw data and the scripts that convert
  the data and build the test fixtures ([legacy-python/README.md](legacy-python/README.md)).

## Development

```bash
pnpm install
pnpm dev     # http://localhost:5173
pnpm lint
pnpm test    # data round trip and filters against the Python/SQLite query
pnpm build   # static site in dist/
```

## Data

The source is `legacy-python/data/all_complexes.csv` (one row per complex)
and `legacy-python/data/structures.tar.gz` (one `.xyz` file per complex).
`public/data/` is generated from them (only needed when they change):

```bash
python3 legacy-python/scripts/build_web_data.py   # -> public/data/
python3 legacy-python/scripts/build_fixtures.py   # -> tests/fixtures/ (needs PyYAML)
```

- `data/table.json.gz` (527 kB; 1.5 MB uncompressed): the columns the plot
  needs (name, X, Y, ΔE, reaction, metal), loaded by the plot page.
- `data/structures/<prefix>.json.gz`: 546 files of 1–71 kB (median 23 kB,
  15 MB in all), one per name prefix (`Pd_0` holds `Pd_0.0` … `Pd_0.N`),
  with the CSV row and the `.xyz` file of each complex. A complex's page
  downloads one of them.

The built site is 559 files, 19 MB.

## Citation

No paper or data DOI is recorded in this repository or in the original code.

## Original code

The Bokeh server version (Python, `bokeh serve figure detail select-figure`,
SQLite database, JSmol, Docker) is in the git history up to commit `81f54b9`,
and kept for reference in `legacy-python/`.
