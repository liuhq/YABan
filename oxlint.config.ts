import { defineConfig } from "oxlint"

export default defineConfig({
  ignorePatterns: ["dist/**", ".react-router/**", "node_modules/**"],
  plugins: ["eslint", "typescript", "unicorn", "oxc", "import", "react", "jsx-a11y"],
  categories: {
    correctness: "error",
    suspicious: "warn",
    perf: "warn",
  },
  rules: {
    "import/no-cycle": ["error", { maxDepth: 3 }],
    "import/no-unassigned-import": ["error", { allow: ["**/*.css"] }],
    "react/react-in-jsx-scope": "off",
  },
  env: {
    builtin: true,
    browser: true,
    node: true,
  },
})
