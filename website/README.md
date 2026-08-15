# PDL documentation site

Public language docs (VitePress). See [`docs/PROPOSAL_LANGUAGE_SITE.md`](../docs/PROPOSAL_LANGUAGE_SITE.md).

Production URL: **https://mana-machine-ventures-inc.github.io/pdl/** (GitHub Pages, workflow `.github/workflows/docs-pages.yml`). Local preview uses `base: /`. The Pages build sets `GITHUB_PAGES=1` so asset URLs are prefixed with `/pdl/`.

Repo **Settings → Pages → Source** must be **GitHub Actions** (first deploy creates the `github-pages` environment).

```bash
# from repo root
npm run docs:dev      # generate + vitepress
npm run docs:build    # generate + static build → website/src/.vitepress/dist
```

The public site is four pages: About (`website/src/index.md`), Getting Started (`website/src/getting-started.md`), Language (the vocabulary), and Diagnostics (keywords are on that page).

CI runs `npm run docs:build` and fails if generated Markdown is stale. Edit `grammar/pdl.ebnf` by hand; `docs:gen` wraps it as unpublished `grammar.md`.
