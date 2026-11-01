# Thursday - Dependencies

## fieber.css

- https://github.com/trythursday/fieber
- Copyright (c) 2022-2025 zichy
- Copyright (c) 2026 Siddharth Singh and the Thursday contributors
- MIT

## bun

- https://bun.sh
- https://github.com/oven-sh/bun
- MIT
- The runtime for `scripts/`, and Thursday's own default. Optional on the host:
  `scripts/bunstrap.sh` installs a pinned copy into the Thursday root when it is
  missing, so nothing has to be installed system-wide.

## node

- https://nodejs.org
- MIT
- The scripts that reach a user also run on node 24 and up, for someone who does
  not run bun. `bunstrap` falls back to node when bun is not installed, and
  installs nothing.

  Whichever runtime ran setup is recorded in `[install].runtime` and baked into
  the generated skills, so an agent always invokes the resolver with the runtime
  this install actually has. Nothing has to be detected twice.

- The repo's own tools stay bun-only: `home.ts` (marked `maintainer: true`),
  `sessions-viewer.ts`, `tree-render.ts`, and `idea-finder.ts`.

## npm packages

Only `scripts/sessions-viewer.ts` needs these, and it is a repo tool, not part of
an install. `bun install` fetches them.

- commander · MIT · https://github.com/tj/commander.js
- markdown-to-ansi · MIT · https://github.com/jdan/markdown-to-ansi
- wrap-ansi · MIT · https://github.com/chalk/wrap-ansi
