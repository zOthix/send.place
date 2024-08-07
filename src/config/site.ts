export const siteConfig = {
  name: "SEND | send.place",
  description: "Distribute ether or tokens to multiple adresses",
  url: "https://send.play",
  ogImage: "https://send.play/preview.jpg",
  links: {
    twitter: "https://twitter.com/PontemNetwork",
    github: "https://github.com/pontem-network",
  },
} as const;

export type SiteConfig = typeof siteConfig;
