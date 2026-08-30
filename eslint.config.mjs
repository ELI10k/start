import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated test output. Playwright's HTML report ships a bundled app, and
    // linting it drowns the real findings in thousands of vendor warnings.
    "reports/**",
  ]),
  {
    // An underscore is how this repository says "destructured only so it is
    // dropped". Without it the omit-by-rest idiom - `({ id: _id, ...row })` -
    // is reported four times in one diagnostic script and the real findings
    // scroll off the top.
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
        ignoreRestSiblings: true,
      }],
    },
  },
]);

export default eslintConfig;
