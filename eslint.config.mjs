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
    "coverage/**",
    "*.config.js",
    "jest.setup.js",
  ]),
  {
    files: ["**/__tests__/**/*", "**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    rules: {
      // Allow 'any' in error handlers and API routes (common pattern)
      "@typescript-eslint/no-explicit-any": ["warn", { 
        ignoreRestArgs: true,
        fixToUnknown: false 
      }],
      // Allow unescaped entities in JSX (common in user content)
      "react/no-unescaped-entities": "warn",
      // Allow unused vars that start with underscore
      "@typescript-eslint/no-unused-vars": ["warn", { 
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_" 
      }],
    },
  },
]);

export default eslintConfig;
