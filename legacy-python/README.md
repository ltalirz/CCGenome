# legacy-python

The Bokeh server app this web app replaces (as of commit `81f54b9`), kept as
a reference, with the raw data and the scripts that convert it for the web
app.

- `figure/`, `detail/`, `select-figure/`: the Bokeh apps (scatter plot,
  page of a complex, choice of figure). `figure/static/*.yml` are the
  original plot configuration; the web app's copies are in `src/config/`.
- `import_db.py`: built `data/database.db` (SQLite) from the CSV.
- `setup.py`, `Dockerfile`, `docker-compose.yml`, `serve-app.sh`,
  `prepare.sh`: the old installation and deployment. They expect the data
  files at the repository root, where they were before the move, so they do
  not run from here as is.
- `data/all_complexes.csv`, `data/structures.tar.gz`: the source of the web
  data.
- `data/database.db`: the database the deployed Bokeh app read. Not used by
  the web app; kept because it differs from the CSV (Reaction column, see
  `MIGRATION_NOTES.md`) and the fixtures compare against it.
- `../scripts/prepareForFrontend.py` (moved from here): CSV + structures -> `../data/`
  (standard library only).
- `scripts/build_fixtures.py`: runs the SQL of `figure/query.py` for each
  preset and a set of filter settings, on the CSV and on `database.db`
  -> `tests/fixtures/filters.json.gz` (needs PyYAML).

```bash
python3 scripts/prepareForFrontend.py
python3 legacy-python/scripts/build_fixtures.py
```
