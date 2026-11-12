import { defineConfig } from "vite";

export default defineConfig({
  // Relative URLs make the site work at both a custom domain and
  // a GitHub Pages project URL such as /username/gridborn-racing/.
  base: "./",
  build: {
    target: "es2022",
    sourcemap: true,
    cssCodeSplit: true
  },
  server: {
    host: true
  }
});
