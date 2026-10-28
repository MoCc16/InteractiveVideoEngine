"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppIcon, type IconName } from "@/components/ui/icons";

const RAIL: Array<{ href: string; label: string; icon: IconName; enabled: boolean }> = [
  { href: "/", label: "首页", icon: "home", enabled: true },
  { href: "/projects", label: "项目", icon: "folder", enabled: true },
  { href: "/verse", label: "Verse", icon: "sparkle", enabled: false },
  { href: "/library", label: "素材库", icon: "library", enabled: false },
];

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === "/") return pathname === "/" || pathname === "";
  return pathname.startsWith(href);
}

/** 左侧悬浮图标栏 */
export function AppRail() {
  const pathname = usePathname();
  return (
    <nav className="app-rail" aria-label="主导航">
      {RAIL.map((item) =>
        item.enabled ? (
          <Link
            key={item.href}
            href={item.href}
            className={`app-rail-item${isActive(pathname, item.href) ? " app-rail-item-active" : ""}`}
          >
            <AppIcon name={item.icon} size={18} />
            <span>{item.label}</span>
          </Link>
        ) : (
          <span key={item.href} className="app-rail-item app-rail-item-off" title="未实现">
            <AppIcon name={item.icon} size={18} />
            <span>{item.label}</span>
          </span>
        ),
      )}
    </nav>
  );
}

/** 右上角：礼物 / 通知 / 积分 / 账户（数据暂为占位，接服务端后替换） */
export function AppTopBar({ credits = 264, userName = "oz36" }: { credits?: number; userName?: string }) {
  return (
    <div className="app-topbar">
      <div className="app-topwrap">
        <button type="button" className="app-icon-btn" aria-label="活动">
          <AppIcon name="gift" size={16} />
        </button>
        <button type="button" className="app-icon-btn" aria-label="通知">
          <AppIcon name="bell" size={16} />
        </button>
        <span className="app-credits">
          <AppIcon name="bolt" size={14} />
          {credits}
        </span>
        <span className="app-account">
          <span className="app-avatar">{userName.slice(0, 1).toUpperCase()}</span>
          {userName}
        </span>
      </div>
    </div>
  );
}

/** 品牌标识（首页左上） */
export function AppBrand({ subtitle = "EVERY CHOICE, A NEW SCENE" }: { subtitle?: string }) {
  return (
    <div className="app-hero-brand">
      <div className="app-hero-brand-mark">
        <AppIcon name="film" size={18} />
      </div>
      <div>
        <div className="app-hero-brand-name">Choiscene</div>
        <div className="app-hero-brand-sub">{subtitle}</div>
      </div>
    </div>
  );
}