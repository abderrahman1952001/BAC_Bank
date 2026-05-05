# Design System

This document is the working source of truth for UI implementation in `apps/web`.
Use it before changing app surfaces, especially admin tools, student workflows,
auth, billing, training, library, and lab pages.

## Visual Direction

- The app defaults to dark mode.
- The dark theme is ink/navy, not pure carbon black.
- Keep the interface calm, dense, and operational. This is a study/work tool,
  not a marketing site.
- Use the green accent for primary action and active state. Use warm gold only
  as a secondary support/accent tone.
- Avoid one-note palettes, decorative gradient blobs, and heavy card mosaics.
- Prefer full-width work surfaces, sidebars, rails, inspectors, and simple
  section bands over nested card stacks.

## Component Policy

Use local shadcn primitives first:

- Actions: `Button`
- Text entry: `Input`, `Textarea`
- Browser-native selects: `NativeSelect`
- Checkboxes: `Checkbox`
- Small exclusive option sets: `ToggleGroup`
- Status labels: `Badge`
- Dividers: `Separator`

Use `asChild` for links rendered as buttons. Icons inside buttons must use
`data-icon` and should not carry manual size classes.

Do not reintroduce legacy action/control classes:

- `btn-primary`
- `btn-secondary`
- `btn-ghost`
- `study-toggle-button`
- `lab-toggle`
- `theme-toggle`
- `source-icon-button`
- `admin-icon-button`
- `student-icon-button`
- `library-clear-button`
- `theater-subtle-action`

Do not add raw `<input>`, `<select>`, or `<textarea>` in app components. Add
or extend a local primitive in `apps/web/src/components/ui` instead.

## Tailwind And CSS

- Tailwind v4 tokens live in `apps/web/src/app/globals.css`.
- Prefer semantic variables: `--background`, `--foreground`, `--primary`,
  `--secondary`, `--muted`, `--accent`, `--border`, `--input`, `--ring`.
- Do not hard-code color utility classes for routine UI state.
- Component classes may handle layout and sizing. Avoid using `className` to
  override primitive colors and typography.
- Add domain CSS only when the domain surface needs a real layout or visual
  language beyond primitive composition.

## Forms And Controls

- Use `Input`, `NativeSelect`, `Textarea`, and `Checkbox` for all visible form
  controls.
- Use `ToggleGroup` for 2-7 mutually exclusive options.
- For larger or mixed option sets, use a local app primitive built on shadcn
  components rather than repeating bespoke button classes.
- Keep disabled, focus, and invalid states on the primitive unless there is a
  strong accessibility reason to extend them.

## QA Bar

Every meaningful UI pass should verify:

- `npm run lint -w @bac-bank/web`
- relevant focused tests
- `npm run test -w @bac-bank/web` for broad web changes
- `npm run build -w @bac-bank/web` before claiming completion
- browser screenshots for desktop and mobile when layout or visual behavior
  changes

Visual checks should confirm:

- no horizontal overflow on mobile
- no clipped button/control text
- no legacy control classes in rendered DOM
- no visible raw native controls outside local shadcn primitives
- dark mode remains the default and reads as ink/navy
