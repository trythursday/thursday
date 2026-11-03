# Thursday — see README.md.

# List the available recipes.
default:
    @just --list

# `just find revisit` · `just find jsr` · `just find "move JSR"`
# Search everything — hidden files and every ignored personal/ dir included.
find query:
    @rg -n -S --hidden '{{query}}' . $(find . \( -name node_modules -o -name .git \) -prune -o -type d -name personal -print)

# Discover ideas in a file (prompts; default from $IDEA_FINDER_FILE in .env).
find-idea:
    @set -a && . ./.env && bun run scripts/idea-finder.ts
