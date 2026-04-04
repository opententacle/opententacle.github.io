/** Vite base, e.g. "/" or "/repo/" */
export const base = import.meta.env.BASE_URL;

export type AppRoute = { kind: "list" } | { kind: "article"; slug: string } | { kind: "contributors" };

export const APP_NAVIGATE_EVENT = "ot-app-navigate";

function normalizedBase(): string {
  return base.replace(/\/+$/, "") || "";
}

/** Pathname relative to site base (leading slash). */
export function pathnameWithinBase(pathname: string): string {
  const prefix = normalizedBase();
  let p = pathname;
  if (prefix && p.startsWith(prefix)) {
    p = p.slice(prefix.length) || "/";
  }
  if (!p.startsWith("/")) {
    p = `/${p}`;
  }
  return p;
}

export function pathToRoute(pathname: string): AppRoute {
  const rel = pathnameWithinBase(pathname);
  const parts = rel.split("/").filter(Boolean);
  if (parts[0] === "article" && parts[1]) {
    return { kind: "article", slug: decodeURIComponent(parts[1]) };
  }
  if (parts[0] === "contributors") {
    return { kind: "contributors" };
  }
  return { kind: "list" };
}

export function hrefForArticle(slug: string): string {
  return `${base}article/${encodeURIComponent(slug)}`;
}

/** Site root (blog index). */
export function hrefForHome(): string {
  return base;
}

export function hrefForContributors(): string {
  return `${base}contributors`;
}

/** Contributors page with hash for scrolling to a profile card (`id` on the card). */
export function hrefForContributorProfile(contributorId: string): string {
  return `${base}contributors#${encodeURIComponent(contributorId.trim())}`;
}

export function href(path: string) {
  return `${base}${path}`;
}

/** Client-side navigation (History API); does not fire `popstate`. */
export function navigate(pathWithSearchHash: string): void {
  history.pushState(null, "", pathWithSearchHash);
  window.dispatchEvent(new Event(APP_NAVIGATE_EVENT));
}

export function handleInternalNav(e: MouseEvent): void {
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  if (e.button !== 0) return;
  const a = e.currentTarget as HTMLAnchorElement;
  let url: URL;
  try {
    url = new URL(a.href);
  } catch {
    return;
  }
  if (url.origin !== window.location.origin) return;
  e.preventDefault();
  navigate(url.pathname + url.search + url.hash);
}
