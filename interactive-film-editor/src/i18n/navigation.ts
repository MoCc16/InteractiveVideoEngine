/**
 * 导航唯一入口（对齐 morph 约定：禁止在业务代码里硬编码路由）。
 * Phase 1 复用 next/link + next/navigation；接入 next-intl 后只改这里。
 */
export { default as Link } from "next/link";
export { redirect, usePathname, useRouter } from "next/navigation";