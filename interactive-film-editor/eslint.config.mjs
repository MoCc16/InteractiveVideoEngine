import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  { ignores: ["node_modules/**", ".next/**", "out/**", "coverage/**", "next-env.d.ts"] },
  {
    files: ["src/**/*.{ts,tsx}"],
    // 视觉原语目录（icons / graph）是唯一允许出现 <svg> 的地方
    ignores: ["src/components/ui/icons/**", "src/components/ui/graph/**"],
    rules: {
      "no-restricted-imports": ["error", { paths: [{ name: "lucide-react", message: "Import icons through '@/components/ui/icons' only." }] }],
      "no-restricted-syntax": ["error", { selector: "JSXOpeningElement[name.name='svg']", message: "Use AppIcon or icons module components instead of inline <svg>." }],
      "max-lines-per-function": ["warn", { max: 80, skipBlankLines: true, skipComments: true }],
      complexity: ["warn", 15],
    },
  },
];

export default eslintConfig;
