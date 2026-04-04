import type { ArticleMeta } from "../utils/articles.js";
import type { ContributorLinkKind } from "../utils/contributor-links.js";

export type ContributorLink = {
  href: string;
  /** Screen reader / tooltip text. Defaults from kind if omitted. */
  label?: string;
  /**
   * Which icon to show (GitHub, LinkedIn, …). If omitted, inferred from `href`
   * when possible; otherwise a generic link icon is used.
   */
  kind?: ContributorLinkKind;
};

export type ContributorProfile = {
  id: string;
  name: string;
  tagline?: string;
  bio: string;
  links?: ContributorLink[];
};

export function getContributorById(id: string): ContributorProfile | undefined {
  const t = id.trim();
  return contributors.find((c) => c.id === t);
}

/** Match `author` / `author-id` metadata to a profile (by id, then by display name). */
export function resolveContributorForArticle(meta: ArticleMeta): ContributorProfile | undefined {
  if (meta.authorId) {
    const byId = getContributorById(meta.authorId);
    if (byId) return byId;
  }
  if (meta.author) {
    const v = meta.author.trim();
    const byId = getContributorById(v);
    if (byId) return byId;
    const lower = v.toLowerCase();
    return contributors.find((c) => c.name.trim().toLowerCase() === lower);
  }
  return undefined;
}

export const contributors: ContributorProfile[] = [
  {
    id: "cs",
    name: "Christoph Spörk",
    tagline: "Editor & maintainer",
    bio: "Machine Learning/AI Engineer - Software Engineer/Architect - Computer Scientist",
    links: [
      { kind: "github", href: "https://github.com/DarwinsBuddy" },
      {
        kind: "linkedin",
        href: "https://www.linkedin.com/in/christoph-sp%C3%B6rk-a030a385/",
      },
    ],
  },
];
