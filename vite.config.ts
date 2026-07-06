import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Base is relative so the built app can be opened from any subpath (GitHub Pages, file host, GoDEVICE kiosk).
export default defineConfig({
  base: "./",
  plugins: [react()],
  server: { port: 5177, host: true },
});
