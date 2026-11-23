#!/usr/bin/env python3
"""Prepare the data the web app serves (data/, served at data/) from the raw data.

Input (legacy-python/data/):
  all_complexes.csv   one row per complex (25,112 rows)
  structures.tar.gz   structures/<Name>.xyz for every complex

Output (data/), JSON (the host compresses it on the wire):
  table.json                the columns the scatter plot needs, as columns:
                            {"name": [...], "X": [...], "Y": [...],
                             "DeltaE": [...], "Reaction": [...],
                             "bond_type": [...]}
  structures/<prefix>.json
                            the complexes whose name starts with <prefix>
                            (the name up to the "."; e.g. Pd_0 holds
                            Pd_0.0 ... Pd_0.N): {"columns": [CSV header],
                            "complexes": {name: {"row": [CSV fields],
                            "xyz": "<the .xyz file>"}}}

CSV fields and .xyz files are kept as text, unchanged; numbers in
table.json are the CSV values parsed as doubles (Python's float(), the same
double as JavaScript's parseFloat). Only the Python standard library is used.

Run from anywhere:  python3 scripts/prepareForFrontend.py
"""
import csv
import json
import shutil
import tarfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "legacy-python" / "data"
OUT = ROOT / "data"

# CSV header -> column id used by the app (the ids of src/config/columns.yml)
TABLE_COLUMNS = {
    "Name": "name",
    "X [ ]": "X",
    "Y [ ]": "Y",
    "DeltaE [kcal/mol]": "DeltaE",
    "Reaction": "Reaction",
    "bond type": "bond_type",
}
FLOATS = {"X", "Y", "DeltaE"}
INTS = {"bond_type"}


def shard_of(name):
    """Name of the structure file holding a complex: Pd_0.10 -> Pd_0."""
    return name.split(".")[0]


def read_csv(path):
    with open(path, newline="", encoding="utf-8") as f:
        rows = list(csv.reader(f))
    return rows[0], rows[1:]


def read_structures(path):
    """{name: xyz text} of structures/<name>.xyz in the archive (other files,
    such as a stray JVM crash log, are skipped)."""
    out = {}
    with tarfile.open(path, "r:gz") as tar:
        for member in tar:
            if not (member.isfile() and member.name.startswith("structures/")
                    and member.name.endswith(".xyz")):
                continue
            name = member.name[len("structures/"):-len(".xyz")]
            out[name] = tar.extractfile(member).read().decode("utf-8")
    return out


def write_json(path, obj):
    path.write_text(json.dumps(obj, separators=(",", ":"), ensure_ascii=False), encoding="utf-8")
    return path.stat().st_size


def main():
    header, rows = read_csv(DATA / "all_complexes.csv")
    structures = read_structures(DATA / "structures.tar.gz")

    names = [row[0] for row in rows]
    assert len(set(names)) == len(names), "duplicate names in the CSV"
    missing = [n for n in names if n not in structures]
    assert not missing, f"no structure for {missing[:5]}"
    extra = sorted(set(structures) - set(names))
    if extra:
        print(f"note: {len(extra)} structures without a CSV row, not published: {extra[:5]}")

    if OUT.exists():
        shutil.rmtree(OUT)
    (OUT / "structures").mkdir(parents=True)

    index = {h: header.index(h) for h in TABLE_COLUMNS}
    table = {}
    for h, key in TABLE_COLUMNS.items():
        values = [row[index[h]] for row in rows]
        if key in FLOATS:
            values = [float(v) for v in values]
        elif key in INTS:
            values = [int(v) for v in values]
        table[key] = values
    table_size = write_json(OUT / "table.json", table)

    shards = {}
    for row in rows:
        shards.setdefault(shard_of(row[0]), {})[row[0]] = {
            "row": row,
            "xyz": structures[row[0]],
        }
    sizes = [
        write_json(OUT / "structures" / f"{key}.json", {"columns": header, "complexes": complexes})
        for key, complexes in shards.items()
    ]
    sizes.sort()
    print(f"table.json: {len(rows)} rows, {table_size / 1e3:.0f} kB")
    print(
        f"structures/: {len(sizes)} files, {sum(sizes) / 1e6:.1f} MB "
        f"(median {sizes[len(sizes) // 2] / 1e3:.0f} kB, max {sizes[-1] / 1e3:.0f} kB)"
    )


if __name__ == "__main__":
    main()
