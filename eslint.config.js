import js from "@eslint/js";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    files: ["**/*.js", "**/*.mjs", "**/*.cjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.browser, ...globals.node, messenger: "readonly", browser: "readonly" },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["**/*.cjs"],
    languageOptions: { sourceType: "commonjs" },
  },
  {
    ignores: ["types/**", "node_modules/**", "web-ext-artifacts/**", "tmp/**", "claude-plans/**", "code_analysis_results/**"],
  },
];
