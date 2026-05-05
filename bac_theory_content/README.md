# BAC theory content

This folder separates curriculum identity, source extraction, and platform-ready canonical lessons.

## Folder model

- `programmes/`: official subject programmes by subject and stream.
- `sources/`: faithful material extracted from books, scans, teacher notes, or other source packs.
- `canonical/`: platform-authored lessons assembled from one or more sources and aligned to the official programme.

## Source naming

Sources are grouped first by subject, then by stream or stream group, then by
numbered source folder:

```text
sources/
  svt/
    SE/
      source 1 (name)/
  math/
    SE-M-MT/
      source 1 (name)/
```

Use grouped stream folders such as `SE-M-MT` when the same source pack is meant
to serve those streams together. Do not duplicate the same source under every
individual stream unless the actual content differs.

Numbering is local to each subject and stream group, so future material can be
added without renaming unrelated subjects:

- `source 1 (name)`
- `source 2 (name)`
- `source 3 (name)`

Each source may contain:

- `source.yml`: source metadata.
- `curriculum/`: pages that describe the source's table of contents or curriculum coverage.
- `units/<unit-slug>/scans/`: original scans for a unit.
- `units/<unit-slug>/assets/`: cropped diagrams, tables, and figures.
- `units/<unit-slug>/crops.json`: crop manifest for regenerating assets.
- `units/<unit-slug>/extracted.md`: faithful cleaned extraction from that source.

Some subjects use direct unit folders when the source already lives under a
subject/stream path. For example:

- `sources/math/SE-M-MT/source 1 (name)/functions/scans/`
- `sources/math/SE-M-MT/source 1 (name)/functions/assets/`
- `sources/math/SE-M-MT/source 1 (name)/functions/crops.json`
- `sources/math/SE-M-MT/source 1 (name)/functions/extracted.md`

The canonical layer should not duplicate the source folder structure. It should represent the platform's chosen learning path.
