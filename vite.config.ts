import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages serves the app under /<repo-name>/. Override with VITE_BASE for
// a custom domain or local preview at root.
const base = process.env.VITE_BASE ?? "/commander-table/";

export default defineConfig({
  base,
  plugins: [react()],
});
