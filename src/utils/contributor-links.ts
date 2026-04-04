export type ContributorLinkKind =
  | "github"
  | "linkedin"
  | "mastodon"
  | "twitter"
  | "bluesky"
  | "gitlab"
  | "youtube"
  | "website"
  | "email"
  | "other";

export function inferContributorLinkKind(href: string): ContributorLinkKind | undefined {
  const h = href.trim().toLowerCase();
  if (h.startsWith("mailto:")) return "email";
  try {
    const u = new URL(h, "https://example.com");
    const host = u.hostname.replace(/^www\./, "");
    if (host === "github.com" || host.endsWith(".github.com")) return "github";
    if (host === "linkedin.com" || host.endsWith(".linkedin.com")) return "linkedin";
    if (host.includes("mastodon")) return "mastodon";
    if (host === "twitter.com" || host === "x.com") return "twitter";
    if (host === "bsky.app" || host.endsWith(".bsky.app")) return "bluesky";
    if (host === "gitlab.com" || host.endsWith(".gitlab.com")) return "gitlab";
    if (host === "youtube.com" || host === "youtu.be") return "youtube";
  } catch {
    /* ignore */
  }
  return undefined;
}

export function contributorLinkIconClass(kind: ContributorLinkKind): string {
  switch (kind) {
    case "github":
      return "fa-brands fa-github";
    case "linkedin":
      return "fa-brands fa-linkedin-in";
    case "mastodon":
      return "fa-brands fa-mastodon";
    case "twitter":
      return "fa-brands fa-x-twitter";
    case "bluesky":
      return "fa-brands fa-bluesky";
    case "gitlab":
      return "fa-brands fa-gitlab";
    case "youtube":
      return "fa-brands fa-youtube";
    case "email":
      return "fa-solid fa-envelope";
    case "website":
      return "fa-solid fa-globe";
    default:
      return "fa-solid fa-link";
  }
}

export function resolveContributorLinkKind(href: string, explicit?: ContributorLinkKind): ContributorLinkKind {
  if (explicit && explicit !== "other") return explicit;
  return inferContributorLinkKind(href) ?? (explicit === "other" ? "other" : "website");
}

export function defaultLabelForKind(kind: ContributorLinkKind): string {
  switch (kind) {
    case "github":
      return "GitHub";
    case "linkedin":
      return "LinkedIn";
    case "mastodon":
      return "Mastodon";
    case "twitter":
      return "X / Twitter";
    case "bluesky":
      return "Bluesky";
    case "gitlab":
      return "GitLab";
    case "youtube":
      return "YouTube";
    case "website":
      return "Website";
    case "email":
      return "Email";
    default:
      return "Link";
  }
}
