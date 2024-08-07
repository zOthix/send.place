import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwind from "@astrojs/tailwind";
import cloudflare from "@astrojs/cloudflare";
import icon from "astro-icon";
import { defineConfig } from "astro/config";
import simpleStackForm from "simple-stack-form";
import svgr from "vite-plugin-svgr";

// https://astro.build/config
export default defineConfig({
  site: "https://send-play.vercel.app",
  integrations: [
    mdx({
      syntaxHighlight: "shiki",
      shikiConfig: {
        theme: "github-dark-dimmed",
      },
      gfm: true,
    }),
    icon(),
    sitemap(),
    react(),
    tailwind({
      applyBaseStyles: false,
    }),
    simpleStackForm(),
  ],
  output: "static",
  vite: {
    define: {
      "process.env": JSON.stringify({}),
    },
    plugins: [svgr()],
  },
});
