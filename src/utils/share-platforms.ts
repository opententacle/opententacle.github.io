export type SharePlatform =
  | "x"
  | "linkedin"
  | "reddit"
  | "hackernews"
  | "facebook"
  | "whatsapp"
  | "telegram"
  | "mastodon"
  | "bluesky"
  | "threads";

export type SharePlatformConfig = {
  id: SharePlatform;
  label: string;
  iconClass: string;
};

export const SHARE_PLATFORMS: SharePlatformConfig[] = [
  { id: "x", label: "Share on X", iconClass: "fa-brands fa-x-twitter" },
  { id: "linkedin", label: "Share on LinkedIn", iconClass: "fa-brands fa-linkedin-in" },
  { id: "reddit", label: "Share on Reddit", iconClass: "fa-brands fa-reddit-alien" },
  { id: "hackernews", label: "Share on Hacker News", iconClass: "fa-brands fa-hacker-news" },
  { id: "facebook", label: "Share on Facebook", iconClass: "fa-brands fa-facebook-f" },
  { id: "whatsapp", label: "Share on WhatsApp", iconClass: "fa-brands fa-whatsapp" },
  { id: "telegram", label: "Share on Telegram", iconClass: "fa-brands fa-telegram" },
  { id: "mastodon", label: "Share on Mastodon", iconClass: "fa-brands fa-mastodon" },
  { id: "bluesky", label: "Share on Bluesky", iconClass: "fa-brands fa-bluesky" },
  { id: "threads", label: "Share on Threads", iconClass: "fa-brands fa-threads" },
];
