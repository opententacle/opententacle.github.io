import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
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
    const cname = readFileSync(cnamePath, "utf8")
      .trim()
      .replace(/^https?:\/\//i, "")
      .replace(/\/+$/, "");
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

function normalizeDescription(value) {
  return value.replace(/\s+/g, " ").trim().slice(0, 160);
}

function plainTextFromMarkdown(markdown) {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/^>\s+/gm, "")
    .replace(/^#+\s+/gm, "")
    .replace(/[*_~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTitle(markdown, slug) {
  const match = markdown.match(/^#\s+(.+)$/m);
  if (match?.[1]) return match[1].trim();
  return slug.replace(/-/g, " ");
}

function extractCatchline(markdown) {
  const heading = markdown.match(/^#\s+.+$/m);
  if (!heading || heading.index === undefined) return "";
  const afterHeading = markdown.slice(heading.index + heading[0].length).replace(/^\s+/, "");
  const h2 = afterHeading.match(/^##\s+(.+)$/m);
  if (h2?.[1]) return h2[1].trim();
  return "";
}

function articleDescription(article) {
  if (article.catchline) return normalizeDescription(article.catchline);
  const plain = plainTextFromMarkdown(article.raw);
  if (plain) return normalizeDescription(plain);
  return "OpenTentacle is a static blog for essays, analysis, and unpopular opinions.";
}

function discoverArticlesBySlug() {
  const root = resolve(process.cwd(), "src/assets/articles");
  const out = new Map();
  if (!existsSync(root)) return out;
  const stack = [root];
  while (stack.length > 0) {
    const dir = stack.pop();
    if (!dir) continue;
    for (const name of readdirSync(dir)) {
      const fullPath = resolve(dir, name);
      const stats = statSync(fullPath);
      if (stats.isDirectory()) {
        stack.push(fullPath);
        continue;
      }
      if (!stats.isFile() || !fullPath.endsWith(".md")) continue;
      const relativePath = `/${relative(root, fullPath).replace(/\\/g, "/")}`;
      const slug = deriveSlugFromPath(relativePath);
      if (!slug || out.has(slug)) continue;
      const raw = readFileSync(fullPath, "utf8");
      out.set(slug, {
        slug,
        title: extractTitle(raw, slug),
        catchline: extractCatchline(raw),
        raw,
      });
    }
  }
  return out;
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

function seoPayloadForRoute(route, siteUrl, articleMap) {
  const base = {
    siteName: "OpenTentacle",
    image: `${siteUrl}/opententacle.png`,
  };
  if (route === "/") {
    return {
      ...base,
      title: "OpenTentacle",
      description: "OpenTentacle is a static blog for essays, analysis, and unpopular opinions.",
      canonical: `${siteUrl}/`,
      robots: "index,follow",
      ogType: "website",
    };
  }
  if (route.startsWith("/article/")) {
    const slug = decodeURIComponent(route.replace(/^\/article\//, ""));
    const article = articleMap.get(slug);
    if (article) {
      return {
        ...base,
        title: `${article.title} | OpenTentacle`,
        description: articleDescription(article),
        canonical: `${siteUrl}${route}`,
        robots: "index,follow",
        ogType: "article",
      };
    }
    return {
      ...base,
      title: "Article Not Found | OpenTentacle",
      description: "The requested article does not exist.",
      canonical: `${siteUrl}${route}`,
      robots: "noindex,follow",
      ogType: "website",
    };
  }
  if (route === "/contributors") {
    return {
      ...base,
      title: "Contributors | OpenTentacle",
      description: "Meet the contributors behind OpenTentacle.",
      canonical: `${siteUrl}${route}`,
      robots: "index,follow",
      ogType: "website",
    };
  }
  if (route === "/privacy") {
    return {
      ...base,
      title: "Privacy | OpenTentacle",
      description: "Privacy information for OpenTentacle.",
      canonical: `${siteUrl}${route}`,
      robots: "index,follow",
      ogType: "website",
    };
  }
  if (route === "/imprint") {
    return {
      ...base,
      title: "Imprint | OpenTentacle",
      description: "Imprint and legal information for OpenTentacle.",
      canonical: `${siteUrl}${route}`,
      robots: "index,follow",
      ogType: "website",
    };
  }
  return {
    ...base,
    title: "OpenTentacle",
    description: "OpenTentacle is a static blog for essays, analysis, and unpopular opinions.",
    canonical: `${siteUrl}${route}`,
    robots: "index,follow",
    ogType: "website",
  };
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function withSeoHead(indexHtml, payload) {
  const withoutSeo = indexHtml
    .replace(/<title>[\s\S]*?<\/title>/gi, "")
    .replace(/<link[^>]+rel=["']canonical["'][^>]*>/gi, "")
    .replace(/<meta[^>]+name=["']description["'][^>]*>/gi, "")
    .replace(/<meta[^>]+name=["']robots["'][^>]*>/gi, "")
    .replace(/<meta[^>]+property=["']og:[^"']+["'][^>]*>/gi, "")
    .replace(/<meta[^>]+name=["']twitter:[^"']+["'][^>]*>/gi, "");
  const seoHead = [
    `    <title>${escapeHtml(payload.title)}</title>`,
    `    <link rel="canonical" href="${escapeHtml(payload.canonical)}" />`,
    `    <meta name="description" content="${escapeHtml(payload.description)}" />`,
    `    <meta name="robots" content="${escapeHtml(payload.robots)}" />`,
    `    <meta property="og:site_name" content="${escapeHtml(payload.siteName)}" />`,
    `    <meta property="og:title" content="${escapeHtml(payload.title)}" />`,
    `    <meta property="og:description" content="${escapeHtml(payload.description)}" />`,
    `    <meta property="og:type" content="${escapeHtml(payload.ogType)}" />`,
    `    <meta property="og:url" content="${escapeHtml(payload.canonical)}" />`,
    `    <meta property="og:image" content="${escapeHtml(payload.image)}" />`,
    `    <meta name="twitter:card" content="summary_large_image" />`,
    `    <meta name="twitter:title" content="${escapeHtml(payload.title)}" />`,
    `    <meta name="twitter:description" content="${escapeHtml(payload.description)}" />`,
    `    <meta name="twitter:image" content="${escapeHtml(payload.image)}" />`,
  ].join("\n");
  return withoutSeo.replace("</head>", `${seoHead}\n  </head>`);
}

function outputIndexPathForRoute(distDir, route) {
  if (route === "/") return resolve(distDir, "index.html");
  const clean = route.replace(/^\/+/, "").replace(/\/+$/, "");
  return resolve(distDir, clean, "index.html");
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
      name: "prerender-route-html",
      writeBundle(options) {
        const siteUrl = inferSiteUrl();
        if (!siteUrl) {
          console.warn("[prerender-route-html] Skipping prerender: SITE_URL/CNAME/GITHUB_REPOSITORY are not set.");
          return;
        }
        const dir = options.dir ?? resolve(process.cwd(), "dist");
        const templatePath = resolve(dir, "index.html");
        if (!existsSync(templatePath)) return;
        const template = readFileSync(templatePath, "utf8");
        const routes = discoverRoutes();
        const articleMap = discoverArticlesBySlug();
        for (const route of routes) {
          const payload = seoPayloadForRoute(route, siteUrl, articleMap);
          const html = withSeoHead(template, payload);
          const outPath = outputIndexPathForRoute(dir, route);
          mkdirSync(resolve(outPath, ".."), { recursive: true });
          writeFileSync(outPath, html, "utf8");
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
