import { defineConfig } from "vitepress";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const tm = JSON.parse(
  readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "../../../editors/vscode-pdl/syntaxes/pdl.tmLanguage.json"),
    "utf8",
  ),
);
tm.name = "pdl";
tm.displayName = "PDL";

const pages = [
  { text: "About", link: "/" },
  { text: "Getting Started", link: "/getting-started" },
  { text: "Language", link: "/generated/objects" },
  { text: "Diagnostics", link: "/generated/diagnostics" },
];

export default defineConfig({
  title: "PDL",
  description: "A text language for design systems — tokens and components in files, compiled to a layout you can preview.",
  lang: "en-US",
  // Project Pages URL is https://verytinymachines.github.io/pdl/
  base: process.env.GITHUB_PAGES === "1" ? "/pdl/" : "/",
  lastUpdated: true,
  ignoreDeadLinks: true,
  srcExclude: [
    "generated/grammar.md",
    "generated/json-ir.md",
    "generated/error-fixtures.md",
  ],
  markdown: {
    languages: [tm],
  },
  themeConfig: {
    nav: [],
    sidebar: pages,
    socialLinks: [{ icon: "github", link: "https://github.com/VeryTinyMachines/pdl" }],
    search: { provider: "local" },
    outline: [2, 3],
    footer: {
      message: "PDL 1.0.0-beta — locked vocabulary in shared/language-objects.json",
    },
  },
});
