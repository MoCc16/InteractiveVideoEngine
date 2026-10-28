import type { ReactNode } from "react";

/** 内页标题：左标题 + 副信息 + 右侧操作（与目标产品内页一致） */
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="pg-head">
      <span className="pg-title">{title}</span>
      {subtitle ? <span className="pg-sub">{subtitle}</span> : null}
      {actions ? <span className="pg-actions">{actions}</span> : null}
    </div>
  );
}