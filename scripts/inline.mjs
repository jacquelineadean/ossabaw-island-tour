// Turns Parcel's dist/index.html into single-file pages with the local script and
// stylesheet inlined. Remote links (Google Fonts) stay as links. html-inline, which the
// artifact skill uses for this step, fails on remote links.
//
//   node scripts/inline.mjs <dist/index.html> <full.html> [fragment.html]
//
// full.html      a complete document that opens in any browser
// fragment.html  the same page without doctype, <html>, <head> or <body>, and with the
//                <title> first: the form the claude.ai Artifact tool wraps and publishes
import fs from "node:fs";
import path from "node:path";

const [, , entry = "dist/index.html", fullOut = "bundle.html", fragmentOut] = process.argv;
const dir = path.dirname(entry);
const isLocal = (url) => !/^(https?:)?\/\//.test(url) && !url.startsWith("data:");
const read = (url) => fs.readFileSync(path.join(dir, url.split("?")[0]), "utf8");
const attr = (tag, name) =>
  (tag.match(new RegExp(`\\b${name}=(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`)) || []).slice(1).find(Boolean);

const html = fs.readFileSync(entry, "utf8");
const bodyAt = html.search(/<body\b[^>]*>/i);
if (bodyAt < 0) throw new Error("no <body> in " + entry);
const head = html.slice(0, bodyAt);
let body = html.slice(bodyAt).replace(/<body\b[^>]*>/i, "").replace(/<\/body>|<\/html>/gi, "").trim();

const title = (head.match(/<title>[\s\S]*?<\/title>/i) || [""])[0];
if (!title) throw new Error("no <title> in " + entry);
const metas = (head.match(/<meta\b[^>]*>/gi) || []).filter((m) => !/charset=/i.test(m) && attr(m, "name") !== "viewport");
const links = head.match(/<link\b[^>]*>/gi) || [];
const remoteLinks = links.filter((l) => !isLocal(attr(l, "href") || ""));
const css = links
  .filter((l) => attr(l, "rel") === "stylesheet" && isLocal(attr(l, "href") || ""))
  .map((l) => read(attr(l, "href")).replace(/<\/style/gi, "<\\/style"));
if (!css.length) throw new Error("no local stylesheet to inline");

let scripts = 0;
body = body.replace(/<script\b[^>]*><\/script>/g, (tag) => {
  const src = attr(tag, "src");
  if (!src || !isLocal(src)) return tag;
  scripts++;
  const type = attr(tag, "type") === "module" ? ' type="module"' : "";
  return `<script${type}>${read(src).replace(/<\/script/gi, "<\\/script")}</script>`;
});
if (!scripts) throw new Error("no local script to inline");

const page = [title, ...metas, ...remoteLinks, ...css.map((c) => `<style>${c}</style>`)].join("\n");
fs.writeFileSync(
  fullOut,
  `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n${page}\n</head>\n<body>\n${body}\n</body>\n</html>\n`,
);
if (fragmentOut) fs.writeFileSync(fragmentOut, `${page}\n${body}\n`);
