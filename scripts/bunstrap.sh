#!/usr/bin/env sh
# bunstrap: make sure a runtime exists, then hand off to setup.
#
# Prefers bun: one already on PATH, or a pinned copy installed into the Thursday
# root. Falls back to node 24+ for a user who does not run bun. Nothing is
# installed system-wide and no shell profile is touched.
#
#   sh scripts/bunstrap.sh --personal ~/th --skills-dir ~/.commandcode/skills --yes
#   sh scripts/bunstrap.sh --dry-run --personal ~/th --skills-dir ~/.commandcode/skills
#
# Every argument is passed through to scripts/setup.ts. With --dry-run and no
# usable runtime, it prints what it would fetch and exits without running the
# installer.

set -eu

NODE_FLOOR=24

dry_run=false
for arg in "$@"; do
  case "$arg" in
    --dry-run) dry_run=true ;;
  esac
done

BUN_VERSION="1.4.2"
REPO_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)

thursday_root() {
  if [ -n "${THURSDAY_ROOT:-}" ]; then
    printf '%s\n' "$THURSDAY_ROOT"
    return
  fi
  if [ -n "${XDG_DATA_HOME:-}" ]; then
    printf '%s/thursday\n' "$XDG_DATA_HOME"
    return
  fi
  case "$(uname -s)" in
    Darwin) printf '%s/Library/Application Support/thursday\n' "$HOME" ;;
    *) printf '%s/.local/share/thursday\n' "$HOME" ;;
  esac
}

node_is_current() {
  command -v node >/dev/null 2>&1 || return 1
  major=$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null) || return 1
  [ "${major:-0}" -ge "$NODE_FLOOR" ]
}

ROOT=$(thursday_root)
LOCAL_BUN="$ROOT/bin/bun"

RUNTIME=""
RUNTIME_RUN=""

if command -v bun >/dev/null 2>&1; then
  RUNTIME=$(command -v bun)
  RUNTIME_RUN="run"
  printf 'using bun at %s\n' "$RUNTIME" >&2
elif [ -x "$LOCAL_BUN" ]; then
  RUNTIME="$LOCAL_BUN"
  RUNTIME_RUN="run"
  printf 'using bun at %s\n' "$RUNTIME" >&2
elif node_is_current; then
  RUNTIME=$(command -v node)
  printf 'using node at %s\n' "$RUNTIME" >&2
elif $dry_run; then
  printf 'dry run: no bun, and no node %s+ on PATH\n' "$NODE_FLOOR" >&2
  printf 'dry run: would install bun %s, then run setup.ts %s\n' \
    "$BUN_VERSION" "$*" >&2
  exit 0
else
  printf 'bun not found, and no node %s+. installing bun %s into %s/bin\n' \
    "$NODE_FLOOR" "$BUN_VERSION" "$ROOT" >&2
  printf 'this fetches and runs the official installer from bun.sh\n' >&2
  mkdir -p "$ROOT/bin"
  # The official installer appends a PATH block to the user's shell profile
  # unless bun is already on PATH when it finishes. Put the target bin dir on
  # PATH so it exits early and no profile is touched.
  curl -fsSL https://bun.sh/install \
    | PATH="$ROOT/bin:$PATH" BUN_INSTALL="$ROOT" bash -s -- "bun-v$BUN_VERSION" >&2
  RUNTIME="$LOCAL_BUN"
  RUNTIME_RUN="run"
fi

if [ ! -x "$RUNTIME" ]; then
  printf 'no usable runtime after install; tried %s\n' "$RUNTIME" >&2
  exit 2
fi

exec "$RUNTIME" $RUNTIME_RUN "$REPO_DIR/scripts/setup.ts" "$@"
