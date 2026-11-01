#!/usr/bin/env sh
# bunstrap: make sure bun exists, then hand off to setup.
#
# Uses bun if it is already on PATH. If it is not, installs a pinned copy into
# the Thursday root and uses that. Nothing is installed system-wide and no shell
# profile is touched.
#
#   sh scripts/bunstrap.sh --personal ~/th --skills-dir ~/.commandcode/skills --yes
#   sh scripts/bunstrap.sh --dry-run --personal ~/th --skills-dir ~/.commandcode/skills
#
# Every argument is passed through to scripts/setup.ts. With --dry-run and no
# bun, it prints what it would fetch and exits without running the installer.

set -eu

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

ROOT=$(thursday_root)
LOCAL_BUN="$ROOT/bin/bun"

if command -v bun >/dev/null 2>&1; then
  BUN=$(command -v bun)
  printf 'using bun at %s\n' "$BUN" >&2
elif [ -x "$LOCAL_BUN" ]; then
  BUN="$LOCAL_BUN"
  printf 'using bun at %s\n' "$BUN" >&2
elif $dry_run; then
  printf 'dry run: bun %s is missing from %s/bin\n' "$BUN_VERSION" "$ROOT" >&2
  printf 'dry run: would fetch and run https://bun.sh/install, then run setup.ts %s\n' \
    "$*" >&2
  exit 0
else
  printf 'bun not found. installing bun %s into %s/bin\n' \
    "$BUN_VERSION" "$ROOT" >&2
  printf 'this fetches and runs the official installer from bun.sh\n' >&2
  mkdir -p "$ROOT/bin"
  # The official installer appends a PATH block to the user's shell profile
  # unless bun is already on PATH when it finishes. Put the target bin dir on
  # PATH so it exits early and no profile is touched.
  curl -fsSL https://bun.sh/install \
    | PATH="$ROOT/bin:$PATH" BUN_INSTALL="$ROOT" bash -s -- "bun-v$BUN_VERSION" >&2
  BUN="$LOCAL_BUN"
fi

if [ ! -x "$BUN" ]; then
  printf 'bun is still missing after install; tried %s\n' "$BUN" >&2
  exit 2
fi

exec "$BUN" run "$REPO_DIR/scripts/setup.ts" "$@"
