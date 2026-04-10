import type { ArticleEntry } from "./articles.js";
import { getArticleBySlug } from "./articles.js";
import type { AppRoute } from "./router.js";
import { base, hrefForArticle, hrefForContributors, hrefForHome, hrefForImprint, hrefForPrivacy } from "./router.js";

const SITE_NAME = "OpenTentacle";
const DEFAULT_TITLE = "OpenTentacle";
const DEFAULT_DESCRIPTION = "OpenTentacle is a static blog for essays, analysis, and unpopular opinions.";
const DEFAULT_IMAGE = "opententacle.png";

type SeoPayload = {
  title: string;
  description: string;
  canonicalPath: string;
  ogType: "website" | "article";
  robots: string;
};

function absoluteUrl(path: string): string {
  const url = new URL(path, window.location.origin);
  return url.toString();
}

function normalizeDescription(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, 160);
}

function plainTextFromMarkdown(markdown: string): string {
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

function articleDescription(article: ArticleEntry): string {
  const fromCatchline = article.catchline?.trim();
  if (fromCatchline) {
    return normalizeDescription(fromCatchline);
  }
  const plain = plainTextFromMarkdown(article.bodyMarkdown);
  if (plain) {
    return normalizeDescription(plain);
  }
  return DEFAULT_DESCRIPTION;
}

function buildPayload(route: AppRoute): SeoPayload {
  if (route.kind === "article") {
    const article = getArticleBySlug(route.slug);
    if (article) {
      return {
        title: `${article.title} | ${SITE_NAME}`,
        description: articleDescription(article),
        canonicalPath: hrefForArticle(article.slug),
        ogType: "article",
        robots: "index,follow",
      };
    }
    return {
      title: `Article Not Found | ${SITE_NAME}`,
      description: "The requested article does not exist.",
      canonicalPath: `${base}article/${encodeURIComponent(route.slug)}`,
      ogType: "website",
      robots: "noindex,follow",
    };
  }
  if (route.kind === "contributors") {
    return {
      title: `Contributors | ${SITE_NAME}`,
      description: "Meet the contributors behind OpenTentacle.",
      canonicalPath: hrefForContributors(),
      ogType: "website",
      robots: "index,follow",
    };
  }
  if (route.kind === "privacy") {
    return {
      title: `Privacy | ${SITE_NAME}`,
      description: "Privacy information for OpenTentacle.",
      canonicalPath: hrefForPrivacy(),
      ogType: "website",
      robots: "index,follow",
    };
  }
  if (route.kind === "imprint") {
    return {
      title: `Imprint | ${SITE_NAME}`,
      description: "Imprint and legal information for OpenTentacle.",
      canonicalPath: hrefForImprint(),
      ogType: "website",
      robots: "index,follow",
    };
  }
  return {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    canonicalPath: hrefForHome(),
    ogType: "website",
    robots: "index,follow",
  };
}

function upsertMeta(attrName: "name" | "property", attrValue: string, content: string): void {
  let el = document.head.querySelector(`meta[${attrName}="${attrValue}"]`);
  if (!(el instanceof HTMLMetaElement)) {
    el = document.createElement("meta");
    el.setAttribute(attrName, attrValue);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertCanonical(href: string): void {
  let el = document.head.querySelector('link[rel="canonical"]');
  if (!(el instanceof HTMLLinkElement)) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

export function applySeo(route: AppRoute): void {
  const payload = buildPayload(route);
  const canonicalUrl = absoluteUrl(payload.canonicalPath);
  const imageUrl = absoluteUrl(`${base}${DEFAULT_IMAGE}`);
  document.title = payload.title;
  upsertCanonical(canonicalUrl);
  upsertMeta("name", "description", payload.description);
  upsertMeta("name", "robots", payload.robots);
  upsertMeta("property", "og:site_name", SITE_NAME);
  upsertMeta("property", "og:title", payload.title);
  upsertMeta("property", "og:description", payload.description);
  upsertMeta("property", "og:type", payload.ogType);
  upsertMeta("property", "og:url", canonicalUrl);
  upsertMeta("property", "og:image", imageUrl);
  upsertMeta("name", "twitter:card", "summary_large_image");
  upsertMeta("name", "twitter:title", payload.title);
  upsertMeta("name", "twitter:description", payload.description);
  upsertMeta("name", "twitter:image", imageUrl);
}
