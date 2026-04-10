import { copyFileSync, existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";
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

function inferSiteUrl() {
  const explicit = process.env.SITE_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/+$/, "");
  }
  const cnamePath = resolve(process.cwd(), "CNAME");
  if (existsSync(cnamePath)) {
    const cname = readFileSync(cnamePath, "utf8").trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "");
    if (cname) {
      return `https://${cname}`;
    }
  }
  const raw = process.env.GITHUB_REPOSITORY;
  if (!raw) return "";
  const [owner, repo] = raw.split("/");
  if (!owner || !repo) return "";
  const o = owner.toLowerCase();
  const r = repo.toLowerCase();
  if (r === `${o}.github.io`) {
    return `https://${owner}.github.io`;
  }
  return `https://${owner}.github.io/${repo}`;
}

function buildSitemapXml(siteUrl, routes) {
  const urls = routes
    .map((route) => {
      const loc = `${siteUrl}${route}`;
      return `  <url>\n    <loc>${loc}</loc>\n  </url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

function deriveSlugFromPath(path) {
  const normalized = path.replace(/\\/g, "/");
  const match = normalized.match(/\/([^/]+)\.md$/i);
  if (!match?.[1]) return "";
  const basename = match[1];
  if (basename.toLowerCase() !== "index") return basename;
  const parts = normalized.split("/").filter(Boolean);
  return parts.at(-2) ?? "";
}

function discoverRoutes() {
  const root = resolve(process.cwd(), "src/assets/articles");
  const seen = new Set(["/"]);
  if (existsSync(root)) {
    const stack = [root];
    while (stack.length > 0) {
      const dir = stack.pop();
      if (!dir) continue;
      const entries = readdirSync(dir);
      for (const name of entries) {
        const fullPath = resolve(dir, name);
        const stats = statSync(fullPath);
        if (stats.isDirectory()) {
          stack.push(fullPath);
          continue;
        }
        if (!stats.isFile() || !fullPath.endsWith(".md")) continue;
        const relativePath = `/${relative(root, fullPath).replace(/\\/g, "/")}`;
        const slug = deriveSlugFromPath(relativePath);
        if (!slug) continue;
        seen.add(`/article/${encodeURIComponent(slug)}`);
      }
    }
  }
  seen.add("/contributors");
  seen.add("/privacy");
  seen.add("/imprint");
  return [...seen].sort();
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
    {
      name: "seo-artifacts",
      writeBundle(options) {
        const siteUrl = inferSiteUrl();
        if (!siteUrl) {
          console.warn("[seo-artifacts] Skipping sitemap/robots: SITE_URL and GITHUB_REPOSITORY are not set.");
          return;
        }
        const dir = options.dir ?? resolve(process.cwd(), "dist");
        const routes = discoverRoutes();
        const sitemap = buildSitemapXml(siteUrl, routes);
        const robots = `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`;
        writeFileSync(resolve(dir, "sitemap.xml"), sitemap, "utf8");
        writeFileSync(resolve(dir, "robots.txt"), robots, "utf8");
      },
    },
  ],
});
