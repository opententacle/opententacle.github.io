import posthog from "posthog-js";
import { pathToRoute } from "../utils/router.js";
import type { SharePlatform } from "../utils/share-platforms.js";

const posthogKey = import.meta.env.VITE_POSTHOG_KEY;
const posthogHost = import.meta.env.VITE_POSTHOG_HOST || "https://eu.i.posthog.com";
let analyticsEnabled = false;
let currentPathname = "";
let previousPathname = "";

export function initAnalytics() {
  if (!posthogKey) {
    return;
  }

  posthog.init(posthogKey, {
    api_host: posthogHost,
    autocapture: true,
    capture_pageview: true,
    capture_pageleave: true,
    // Cookieless mode: in-memory persistence avoids cookies and local storage.
    persistence: "memory",
    person_profiles: "never",
    respect_dnt: true,
    cookieless_mode: "always",
  });
  analyticsEnabled = true;
  currentPathname = window.location.pathname;
}

export function trackRouteChange(pathname: string) {
  if (!pathname || pathname === currentPathname) return;
  previousPathname = currentPathname;
  currentPathname = pathname;
}

export function captureArticleViewed(props: {
  slug: string;
  title: string;
  hasAuthorProfile: boolean;
}) {
  if (!analyticsEnabled) return;

  const ref = parseReferrer(document.referrer);
  let entryType: "internal" | "external" | "direct_or_unknown" = "direct_or_unknown";
  let referrerHost: string | null = null;
  let referrerSameOrigin = false;

  if (previousPathname) {
    entryType = "internal";
    referrerHost = window.location.host;
    referrerSameOrigin = true;
  } else if (ref) {
    entryType = ref.sameOrigin ? "internal" : "external";
    referrerHost = ref.host;
    referrerSameOrigin = ref.sameOrigin;
  }

  posthog.capture("article_viewed", {
    slug: props.slug,
    title: props.title,
    has_author_profile: props.hasAuthorProfile,
    entry_type: entryType,
    referrer_host: referrerHost,
    referrer_same_origin: referrerSameOrigin,
    from_route: routeKindFromPath(previousPathname),
  });
}

export function captureOutboundLinkClicked(url: URL) {
  if (!analyticsEnabled) return;
  if (url.origin === window.location.origin) return;

  posthog.capture("outbound_link_clicked", {
    link_host: url.host,
    link_path: url.pathname,
    link_kind: classifyLinkKind(url),
    from_route: routeKindFromPath(window.location.pathname),
  });
}

export function captureFooterNavClicked(target: "home" | "contributors" | "privacy" | "imprint") {
  if (!analyticsEnabled) return;

  posthog.capture("footer_nav_clicked", {
    target,
    from_route: routeKindFromPath(window.location.pathname),
  });
}

export function captureShareIntentClicked(channel: SharePlatform, slug: string) {
  if (!analyticsEnabled) return;
  posthog.capture("share_intent_clicked", {
    channel,
    slug,
    from_route: routeKindFromPath(window.location.pathname),
  });
}

export function captureShareLinkCopied(slug: string) {
  if (!analyticsEnabled) return;
  posthog.capture("share_link_copied", {
    slug,
    from_route: routeKindFromPath(window.location.pathname),
  });
}

function parseReferrer(raw: string): { host: string; sameOrigin: boolean } | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return {
      host: url.host,
      sameOrigin: url.origin === window.location.origin,
    };
  } catch {
    return null;
  }
}

function routeKindFromPath(pathname: string): string {
  if (!pathname) return "direct_or_unknown";
  const route = pathToRoute(pathname);
  if (route.kind === "list") return "home";
  if (route.kind === "article") return "article";
  return route.kind;
}

function classifyLinkKind(url: URL): "github" | "social" | "other" {
  const host = url.hostname.toLowerCase();
  if (host.includes("github.com")) return "github";
  if (
    host.includes("x.com") ||
    host.includes("twitter.com") ||
    host.includes("linkedin.com") ||
    host.includes("mastodon") ||
    host.includes("youtube.com") ||
    host.includes("instagram.com")
  ) {
    return "social";
  }
  return "other";
}
