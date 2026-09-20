import { defineConfig } from "oxfmt"

export default defineConfig({
  ignorePatterns: [
    "src-tauri/**",
    "!src-tauri/tauri.conf.json",
    "!src-tauri/capabilities",
    "!src-tauri/capabilities/**",
    "dist/**",
    ".react-router/**",
    "node_modules/**",
  ],
  semi: false,
  sortImports: true,
  sortTailwindcss: {
    stylesheet: "./app/app.css",
  },
})
