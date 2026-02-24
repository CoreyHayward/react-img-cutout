import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import path from "node:path"
import { fileURLToPath } from "node:url"

const dirname =
  typeof __dirname !== "undefined"
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  root: path.resolve(dirname, "demo"),
  plugins: [react(), tailwindcss()],
  publicDir: path.resolve(dirname, "public"),
  build: {
    outDir: path.resolve(dirname, "demo-dist"),
    emptyOutDir: true,
  },
})
