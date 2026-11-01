// thursday-note:
//   desc: builds dist/index.html from site/HOME.md; bun-only, run by `just site`
//   maintainer: true

const source = await Bun.file(
  new URL("../site/HOME.md", import.meta.url),
).text();

const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
const meta: Record<string, string> = {};

for (const line of (frontmatter?.[1] ?? "").split("\n")) {
  const index = line.indexOf(":");
  if (index === -1) continue;
  meta[line.slice(0, index).trim()] = line.slice(index + 1).trim();
}

const body = source.slice(frontmatter?.[0].length ?? 0);

const note = [
  meta["thursday-note"] && `thursday-note: ${meta["thursday-note"]}`,
  meta["thursday-revisit"] && `thursday-revisit: ${meta["thursday-revisit"]}`,
]
  .filter(Boolean)
  .map((line) => `    ${line}\n`)
  .join("");

const comment = note ? `  <!--\n${note}  -->\n` : "";

const page = `<!doctype html>
<html lang="en">
${comment}  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${meta.title ?? "Thursday"}</title>
    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/gh/trythursday/fieber@main/fieber.css"
    />
    <script
      defer
      src="https://analytics.shantaram.xyz/script.js"
      data-website-id="3209ea7f-58ef-4fa7-b887-a0fb047ab944"
    ></script>
  </head>
  <body>
${Bun.markdown.html(body)}  </body>
</html>
`;

await Bun.write(new URL("../dist/index.html", import.meta.url), page);
