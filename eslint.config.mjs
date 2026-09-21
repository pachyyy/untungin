import { FlatCompat } from "@eslint/eslintrc";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "next-env.d.ts",
      "design_handoff_liquid_glass_redesign/**",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // `_`-prefixed params are intentionally unused, not a mistake — e.g.
      // lib/services/*.ts mutating functions take `_actor: Actor` now so
      // the signature doesn't change again once the Device model (planned,
      // see CLAUDE.md "Mobile client") lands and something actually reads it.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
];

export default eslintConfig;
