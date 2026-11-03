#!/usr/bin/env bun
/**
 * Render a nested markdown list into a tree.
 *
 * Input:  any markdown file with `- ` list items nested by two spaces.
 * Output: <basename>.svg         open in a browser
 *         <basename>.excalidraw  open via excalidraw.com -> Open
 *
 *   bun run scripts/tree-render.ts tree.md
 *   bun run scripts/tree-render.ts tree.md out/tree
 *   bun run scripts/tree-render.ts tree.md --stdout      # SVG on stdout, no files
 *   bun run scripts/tree-render.ts tree.md --json        # the node tree as JSON
 *
 * A person runs it and gets two files plus a summary. A script adds --stdout or
 * --json and gets data. Layout and colours are deterministic: the same input
 * always renders the same picture.
 */

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";

const FONT_SIZE = 14;
const CHAR_W = 8.6;
const WRAP_CHARS = 30;
const COL_W = 360;
const MARGIN = 60;
const LINE_H = FONT_SIZE * 1.22;
const GAP = 6;
const PAD = 8;
const BG = "#0f1115";

type Node = {
  text: string;
  depth: number;
  children: Node[];
  parent: Node | null;
  lines?: string[];
  w?: number;
  h?: number;
  x?: number;
  y?: number;
};

const GLYPHS: Record<string, string> = {
  "→": "->",
  "↔": "<->",
  "⇒": "=>",
  "←": "<-",
};

function clean(text: string) {
  let out = text;
  for (const [from, to] of Object.entries(GLYPHS)) out = out.split(from).join(to);
  return out;
}

function parse(markdown: string): Node[] {
  const nodes: Node[] = [];
  const stack: Node[] = [];

  for (const line of markdown.split("\n")) {
    const match = /^(\s*)- (.*)$/.exec(line);
    if (!match) continue;

    const depth = Math.floor(match[1].length / 2);
    const node: Node = {
      text: clean(match[2].trim()),
      depth,
      children: [],
      parent: null,
    };

    while (stack.length && stack[stack.length - 1].depth >= depth) stack.pop();

    if (stack.length) {
      const parent = stack[stack.length - 1];
      parent.children.push(node);
      node.parent = parent;
    }

    nodes.push(node);
    stack.push(node);
  }

  return nodes;
}

function wrap(text: string, width: number) {
  const out: string[] = [];
  let current = "";

  for (const word of text.split(" ")) {
    if (current && current.length + 1 + word.length > width) {
      out.push(current);
      current = word;
    } else {
      current = (current + " " + word).trim();
    }
  }

  if (current) out.push(current);
  return out;
}

function hsvHex(h: number, s: number, v: number) {
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);

  const rgb: [number, number, number] =
    [
      [v, t, p],
      [q, v, p],
      [p, v, t],
      [p, q, v],
      [t, p, v],
      [v, p, q],
    ][i % 6] as [number, number, number];

  return `#${rgb
    .map((c) =>
      Math.round(c * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

function layout(nodes: Node[]) {
  const byDepth = new Map<number, Node[]>();

  for (const node of nodes) {
    const group = byDepth.get(node.depth) ?? [];
    group.push(node);
    byDepth.set(node.depth, group);
  }

  for (const [depth, group] of byDepth) {
    for (const node of group) {
      const lines = wrap(node.text, WRAP_CHARS);
      node.lines = lines;
      node.w = Math.max(...lines.map((l) => l.length)) * CHAR_W;
      node.h = lines.length * LINE_H;
    }

    const total =
      group.reduce((sum, n) => sum + n.h! + 2 * PAD, 0) + GAP * (group.length - 1);

    let y = -total / 2;
    for (const node of group) {
      node.y = y;
      node.x = MARGIN + depth * COL_W;
      y += node.h! + 2 * PAD + GAP;
    }
  }

  const panelFill = new Map<number, string>();
  const textCol = new Map<number, string>();
  const edgeCol = new Map<number, string>();

  for (const [depth, group] of byDepth) {
    const seedKey =
      depth === 0
        ? "thursday"
        : [...new Set(group.map((n) => n.parent?.text ?? ""))].sort().join("|");

    // one hue per column, seeded from the parent text. Exact match with the
    // reference renderer is not a goal; any stable hash gives the same columns
    // the same colour every run.
    const hash = createHash("md5").update(seedKey).digest();
    let h = hash.readUInt32BE(0) / 0x100000000;
    h = (h + depth * 0.61803398875) % 1;

    panelFill.set(depth, hsvHex(h, 0.42, 0.14));
    textCol.set(depth, hsvHex(h, 0.7, 0.82));
    edgeCol.set(depth, hsvHex(h, 0.55, 0.32));
  }

  const ymin = Math.min(...nodes.map((n) => n.y!)) - PAD;
  for (const node of nodes) node.y = node.y! - ymin + MARGIN;

  const maxY = Math.max(...nodes.map((n) => n.y! + n.h!)) + PAD + MARGIN;
  const maxX = Math.max(...nodes.map((n) => n.x! + n.w!)) + PAD + MARGIN;

  return { byDepth, panelFill, textCol, edgeCol, maxX, maxY };
}

function escapeXml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderSvg(
  nodes: Node[],
  layoutResult: ReturnType<typeof layout>,
) {
  const { panelFill, textCol, edgeCol, maxX, maxY } = layoutResult;
  const out: string[] = [];

  out.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(maxX)}" height="${Math.ceil(maxY)}" viewBox="0 0 ${Math.ceil(maxX)} ${Math.ceil(maxY)}" font-family="Menlo,Consolas,monospace">`,
    `<rect x="0" y="0" width="100%" height="100%" fill="${BG}"/>`,
  );

  for (const node of nodes) {
    const px = node.x! + node.w! + PAD;
    const py = node.y! + node.h! / 2;

    for (const child of node.children) {
      const cx = child.x! - PAD;
      const cy = child.y! + child.h! / 2;
      const mx = (px + cx) / 2;
      out.push(
        `<path d="M${px.toFixed(1)},${py.toFixed(1)} C${mx.toFixed(1)},${py.toFixed(1)} ${mx.toFixed(1)},${cy.toFixed(1)} ${cx.toFixed(1)},${cy.toFixed(1)}" fill="none" stroke="${edgeCol.get(node.depth)}" stroke-width="1.1" opacity="0.75"/>`,
      );
    }
  }

  for (const node of nodes) {
    const d = node.depth;
    const rx = node.x! - PAD;
    const ry = node.y! - PAD;

    out.push(
      `<rect x="${rx.toFixed(1)}" y="${ry.toFixed(1)}" width="${(node.w! + 2 * PAD).toFixed(1)}" height="${(node.h! + 2 * PAD).toFixed(1)}" rx="7" ry="7" fill="${panelFill.get(d)}" stroke="#ffffff" stroke-width="1"/>`,
    );

    node.lines!.forEach((line, i) => {
      const y = node.y! + FONT_SIZE + i * LINE_H;
      out.push(
        `<text x="${node.x!.toFixed(1)}" y="${y.toFixed(1)}" font-size="${FONT_SIZE}" fill="${textCol.get(d)}">${escapeXml(line)}</text>`,
      );
    });
  }

  out.push("</svg>");
  return out.join("\n");
}

function randomInts(count: number, seed: number) {
  // deterministic ids/versionNonces so re-renders diff cleanly
  const values: number[] = [];
  let state = seed || 1;
  for (let i = 0; i < count; i++) {
    state = (state * 1103515245 + 12345) % 2147483648;
    values.push(state);
  }
  return values;
}

function renderExcalidraw(
  nodes: Node[],
  layoutResult: ReturnType<typeof layout>,
) {
  const { panelFill, textCol, edgeCol } = layoutResult;
  const elements: Record<string, unknown>[] = [];

  const seedBase = createHash("md5")
    .update(nodes.map((n) => n.text).join("\n"))
    .digest()
    .readUInt32BE(0);
  const randoms = randomInts(nodes.length * 6 + 8, seedBase);
  let r = 0;
  const next = () => randoms[r++ % randoms.length];
  const nid = () => `n${next().toString(36)}${(r++).toString(36)}`;

  for (const node of nodes) {
    const d = node.depth;
    const rx = node.x! - PAD;
    const ry = node.y! - PAD;

    elements.push({
      type: "rectangle",
      version: 1,
      versionNonce: next(),
      isDeleted: false,
      id: nid(),
      fillStyle: "solid",
      strokeWidth: 1,
      strokeStyle: "solid",
      roughness: 0,
      opacity: 100,
      angle: 0,
      x: rx,
      y: ry,
      strokeColor: "#ffffff",
      backgroundColor: panelFill.get(d),
      width: node.w! + 2 * PAD,
      height: node.h! + 2 * PAD,
      seed: next(),
      groupIds: [],
      frameId: null,
      roundness: { type: 3 },
      boundElements: [],
      updated: 1,
      link: null,
      locked: false,
    });

    elements.push({
      type: "text",
      version: 1,
      versionNonce: next(),
      isDeleted: false,
      id: nid(),
      fillStyle: "solid",
      strokeWidth: 1,
      strokeStyle: "solid",
      roughness: 0,
      opacity: 100,
      angle: 0,
      x: node.x!,
      y: node.y!,
      strokeColor: textCol.get(d),
      backgroundColor: "transparent",
      width: node.w!,
      height: node.h!,
      seed: next(),
      groupIds: [],
      frameId: null,
      roundness: null,
      boundElements: [],
      updated: 1,
      link: null,
      locked: false,
      fontSize: FONT_SIZE,
      fontFamily: 3,
      text: node.lines!.join("\n"),
      textAlign: "left",
      verticalAlign: "top",
      containerId: null,
      originalText: node.lines!.join("\n"),
      lineHeight: 1.22,
      baseline: FONT_SIZE,
    });
  }

  for (const node of nodes) {
    const d = node.depth;
    const px = node.x! + node.w! + PAD;
    const py = node.y! + node.h! / 2;

    for (const child of node.children) {
      const cx = child.x! - PAD;
      const cy = child.y! + child.h! / 2;
      const dx = cx - px;
      const dy = cy - py;

      elements.push({
        type: "arrow",
        version: 1,
        versionNonce: next(),
        isDeleted: false,
        id: nid(),
        fillStyle: "solid",
        strokeWidth: 1,
        strokeStyle: "solid",
        roughness: 0,
        opacity: 70,
        angle: 0,
        x: px,
        y: py,
        strokeColor: edgeCol.get(d),
        backgroundColor: "transparent",
        width: Math.abs(dx),
        height: Math.abs(dy),
        seed: next(),
        groupIds: [],
        frameId: null,
        roundness: { type: 2 },
        boundElements: [],
        updated: 1,
        link: null,
        locked: false,
        points: [
          [0, 0],
          [dx, dy],
        ],
        lastCommittedPoint: null,
        startBinding: null,
        endBinding: null,
        startArrowhead: null,
        endArrowhead: null,
      });
    }
  }

  return JSON.stringify(
    {
      type: "excalidraw",
      version: 2,
      source: "https://excalidraw.com",
      elements,
      appState: { gridSize: null, viewBackgroundColor: BG },
      files: {},
    },
    null,
    1,
  );
}

async function main() {
  const args = process.argv.slice(2);
  const flags = new Set(args.filter((a) => a.startsWith("--")));
  const positional = args.filter((a) => !a.startsWith("--"));

  const here = import.meta.dir;
  const input = positional[0];
  if (!input) {
    console.error(
      `usage: bun run ${join(here, "tree-render.ts")} <file.md> [out/base]`,
    );
    process.exit(2);
  }
  const source = resolve(input);

  let markdown: string;
  try {
    markdown = await readFile(source, "utf8");
  } catch {
    console.error(`cannot read ${source}`);
    process.exit(1);
  }

  const nodes = parse(markdown);
  if (!nodes.length) {
    console.error(`no list items found in ${source}`);
    process.exit(1);
  }

  const result = layout(nodes);

  if (flags.has("--json")) {
    console.log(
      JSON.stringify(
        nodes.map((n) => ({
          text: n.text,
          depth: n.depth,
          children: n.children.map((c) => c.text),
        })),
        null,
        2,
      ),
    );
    return;
  }

  const svg = renderSvg(nodes, result);

  if (flags.has("--stdout")) {
    process.stdout.write(`${svg}\n`);
    return;
  }

  const base = positional[1]
    ? resolve(positional[1])
    : basename(source, ".md") === "tree"
      ? join(dirname(source), "tree")
      : resolve(source.replace(/\.md$/, ""));

  await mkdir(dirname(base), { recursive: true });
  await writeFile(`${base}.svg`, svg, "utf8");
  await writeFile(`${base}.excalidraw`, renderExcalidraw(nodes, result), "utf8");

  const counts = [...result.byDepth.entries()]
    .sort(([a], [b]) => a - b)
    .map(([d, g]) => `${d}:${g.length}`)
    .join(" ");

  console.error(`nodes: ${nodes.length}`);
  console.error(`per depth: ${counts}`);
  console.error(`bounds: ${Math.ceil(result.maxX)} x ${Math.ceil(result.maxY)}`);
  console.error(`wrote: ${base}.svg`);
  console.error(`wrote: ${base}.excalidraw`);
}

await main();
