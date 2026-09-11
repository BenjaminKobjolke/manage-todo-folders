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
    // Experiment implementations are privileged scripts, not modules.
    files: ["experiments/**/*.js"],
    languageOptions: { sourceType: "script", globals: { ChromeUtils: "readonly", ExtensionCommon: "readonly", Ci: "readonly" } },
  },
  {
    ignores: ["types/**", "node_modules/**", "web-ext-artifacts/**", "tmp/**", "claude-plans/**", "code_analysis_results/**"],
  },
];
