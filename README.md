# OpenTentacle

Static blog site for **OpenTentacle**: Markdown articles, contributor profiles, and client-side routing. Built with **Vite**, **Lit**, and **TypeScript**, deployed to **GitHub Pages**.

## Features

- **Blog index** — articles loaded from `src/assets/articles/*.md`, sorted by `date` metadata (newest first).
- **Article pages** — Markdown rendered to HTML with metadata chips (date, author, AI-assisted when set); author can link to a contributor profile when it resolves.
- **Contributors** — profiles and social links in `src/data/contributors.ts`; dedicated route `/contributors` with optional hash anchors (`#contributor-id`).
- **SPA routing** — paths such as `/article/<slug>` and `/contributors` are handled in the browser; the dev server and production setup serve `index.html` for unknown paths so refreshes and deep links work.

## Requirements

- **Node.js** (the CI workflow uses Node 24; any recent LTS should work)
- **npm**

## Scripts

| Command        | Description                                      |
| -------------- | ------------------------------------------------ |
| `npm run dev`  | Start Vite dev server (HMR)                      |
| `npm run build`| Typecheck (`tsc`) and production build to `dist` |
| `npm run preview` | Serve `dist` locally                          |
| `npm run lint` | Run Biome                                        |
| `npm run fix`  | Biome with `--fix`                               |

## Quick start

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

## Project layout

```
├── index.html              # App shell (loads /src/app.ts and /src/index.css)
├── public/                 # Copied to dist root as-is (e.g. favicon)
├── src/
│   ├── app.ts              # Root layout, route switch, Font Awesome CSS import
│   ├── index.css           # Global theme and component styles
│   ├── assets/articles/    # One .md file per post; filename (without .md) = URL slug
│   ├── components/         # Lit custom elements (prefix `ot-`)
│   ├── data/               # contributors.ts — people shown on /contributors
│   └── utils/              # Router, article parsing, article meta chips, etc.
├── vite.config.js          # build, SPA dev fallback, GitHub Pages base + 404 copy
└── .github/workflows/      # Deploy `dist` to GitHub Pages on push to `main`
```

## Articles (Markdown)

1. Add a file under **`src/assets/articles/`**, e.g. `my-post.md`. The **slug** in the URL is the basename: `/article/my-post`.
2. Optional **blockquote front matter** at the very top (consecutive `> key: value` lines):

   | Key            | Purpose |
   | -------------- | ------- |
   | `date`         | Used for ordering (ISO-ish strings parse for sort). |
   | `author`       | Display string; can be a contributor **id** (e.g. `cs`) or full name matching `src/data/contributors.ts`. |
   | `author-id`    | Explicit contributor id if you want id + display text split. |
   | `ai-assisted`  | Shown in metadata when set. |

3. First `# heading` is the **title**. First `##` under it is the **catchline** on the blog card (if present).

Example:

```markdown
> date: 2026-04-04
> author: cs

# My title
## Short subtitle for the card

Body starts here…
```

See **`example-article.md`** in the repo root for a minimal template (reference only; posts live under `src/assets/articles/`).

## Authors and contributors

- **`src/data/contributors.ts`** defines `ContributorProfile` entries (`id`, `name`, `bio`, optional `links` with kinds for icons).
- **`resolveContributorForArticle`** (used from `src/utils/article-meta.ts`) matches an article’s `author` / `author-id` to a profile. On the **article** page, a resolved author becomes a link to **`/contributors#<id>`** (scroll handled on the contributors page).

## Routing

- **`/`** — blog list.
- **`/article/<slug>`** — single post.
- **`/contributors`** — contributor list; **`/contributors#<id>`** scrolls to a card.

Navigation uses the History API (`pushState`); internal links use **`handleInternalNav`** so the app updates without full reloads.

### Base URL (`import.meta.env.BASE_URL`)

For **GitHub Pages project sites** (`https://<user>.github.io/<repo>/`), asset and route URLs must include the repo prefix. **`vite.config.js`** sets `base` from **`GITHUB_REPOSITORY`** in CI: user/org site repo `username.github.io` → `base: '/'`, otherwise `base: '/<repo>/'`. Local builds use `base: '/'` unless you set the env var yourself.

## GitHub Pages: why `404.html` equals `index.html`

GitHub Pages has no built-in knowledge of SPA routes. A request to `/article/foo` has no matching static file, so the server would 404. The build copies **`index.html` → `404.html`** so GitHub Pages can still deliver the app shell for those requests; the client router then reads `location.pathname` and renders the correct view.

The **dev** server uses a small middleware (`spa-dev-fallback`) to mirror the same behavior locally.

## Deployment

The workflow **`.github/workflows/release.yml`** runs on pushes to **`main`**: `npm ci`, `npm run build`, uploads **`dist`** to GitHub Pages. Ensure the repository’s **Pages** source is set to **GitHub Actions** (or your chosen source) in the repo settings.

## UI stack notes

- **Lit** custom elements use the **`ot-`** prefix (e.g. `ot-app`, `ot-blog`, `ot-article`).
- **Font Awesome** is imported once in `app.ts`. Components that need icon classes use **light DOM** (`createRenderRoot() { return this; }`) where global FA styles must apply.
- Markdown HTML is sanitized with **DOMPurify** before injection.

## License

This repository’s **software** (source code, build configuration, and tooling in this project) is licensed under the [**GNU General Public License v3.0 only**](https://www.gnu.org/licenses/gpl-3.0.en.html) (SPDX: `GPL-3.0-only`). The full legal text is in the [`LICENSE`](LICENSE) file in the repo root (verbatim copy from the [GNU project](https://www.gnu.org/licenses/gpl-3.0.txt)).

**What that means in brief:** you may use, modify, and redistribute this software under GPLv3’s terms, including that distributed copies or derivative works of the covered code must also be licensed under GPLv3 when conveyed. This is not legal advice; read the license and consult a lawyer for your situation.

**Content** you add separately (for example Markdown posts under `src/assets/articles/`, images, or text not part of the program) is not automatically covered by this README’s summary; clarify rights for your own materials as needed.

To record copyright on new files you add, you can use a one-line notice such as:  
`Copyright (C) <year> <name>` — see [How to use GNU licenses for your own software](https://www.gnu.org/licenses/gpl-howto.en.html).
