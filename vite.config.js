import { copyFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";

/**
 * GitHub Pages: project sites are served at /repo-name/; user/org sites use /.
 * When `base` is wrong, JS/CSS and @font-face URLs 404 — icons show as empty boxes.
 * In GitHub Actions, `GITHUB_REPOSITORY` is set to owner/repo.
 */
function githubPagesBase() {
  const raw = process.env.GITHUB_REPOSITORY;
  if (!raw) return "/";
  const [owner, repo] = raw.split("/");
  if (!owner || !repo) return "/";
  const o = owner.toLowerCase();
  const r = repo.toLowerCase();
  if (r === `${o}.github.io`) return "/";
  return `/${repo}/`;
}

export default defineConfig({
  base: githubPagesBase(),
  build: {
    outDir: "dist",
    sourcemap: false,
    minify: "esbuild",
    cssMinify: "esbuild",
  },
  server: {
    hmr: {
      overlay: false,
    },
  },
  optimizeDeps: {
    include: ["lit"],
  },
  plugins: [
    {
      name: "spa-dev-fallback",
      configureServer(server) {
        return () => {
          server.middlewares.use((req, _res, next) => {
            const raw = req.url ?? "";
            const pathname = raw.split("?")[0] ?? "";
            if (req.method !== "GET") {
              return next();
            }
            if (pathname === "/" || pathname === "") {
              return next();
            }
            if (pathname.startsWith("/@") || pathname.startsWith("/src") || pathname.startsWith("/node_modules")) {
              return next();
            }
            if (/\.[a-zA-Z0-9]+$/.test(pathname)) {
              return next();
            }
            const query = raw.includes("?") ? `?${raw.split("?")[1]}` : "";
            req.url = `/index.html${query}`;
            next();
          });
        };
      },
    },
    {
      name: "github-pages-spa-404",
      writeBundle(options) {
        const dir = options.dir ?? resolve(process.cwd(), "dist");
        const indexHtml = resolve(dir, "index.html");
        const notFoundHtml = resolve(dir, "404.html");
        if (existsSync(indexHtml)) {
          copyFileSync(indexHtml, notFoundHtml);
        }
      },
    },
  ],
});
