// @ts-check
const eslint = require("@eslint/js");
const { defineConfig } = require("eslint/config");
const tseslint = require("typescript-eslint");
const angular = require("angular-eslint");
const noBareHtmlElements = require("./frontend/eslint-plugins/no-bare-html-elements");

module.exports = defineConfig([
  {
    ignores: [
      "dist/**",
      ".angular/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      "frontend/**",
    ],
  },
  {
    files: ["**/*.ts"],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
    ],
    rules: {
      "no-undef": "off",
    },
  },
  {
    files: ["tests/lint-fixtures/**/*.html"],
    plugins: {
      local: { rules: { "no-bare-html-elements": noBareHtmlElements } },
    },
    extends: [angular.configs.templateRecommended],
    rules: {
      "local/no-bare-html-elements": "error",
    },
  },
]);
