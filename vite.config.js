import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const api = process.env.PORTAL_API || "http://127.0.0.1:8787";
const port = Number(process.env.VITE_PORT || 5173);

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port,
    strictPort: true,
    proxy: {
      "/api": api,
    },
  },
});
