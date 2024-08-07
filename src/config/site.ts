export const siteConfig = {
  name: "SEND | send.place",
  description: "Distribute ether or tokens to multiple adresses",
  url: "https://disperse.vercel.app",
  ogImage: "https://disperse.vercel.app/preview.jpg",
  links: {
    twitter: "https://twitter.com/PontemNetwork",
    github: "https://github.com/pontem-network",
  },
} as const;

export type SiteConfig = typeof siteConfig;
