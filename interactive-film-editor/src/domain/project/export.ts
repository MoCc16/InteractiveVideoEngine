/**
 * 导出报价（与目标产品一致的计费口径，逆向实测）：
 * - 单价 200 积分/节点；
 * - 首次导出按全部节点计费（billableNodes = 节点数）；
 * - 网页版/桌面版共用基线：第二个目标享 5 折；
 * - Android 使用独立基线（不打折）。
 * 这里只算钱，不构建——本仓库没有构建机。
 */
import type { ProjectDoc } from "@/domain/project/schema";

export const PRICE_PER_NODE = 200;
export const SECOND_TARGET_MULTIPLIER = 0.5;

export type ExportTarget = "web" | "launcher" | "desktop" | "apk";

export const TARGET_LABEL: Record<ExportTarget, string> = {
  web: "网页版",
  launcher: "本地启动器",
  desktop: "桌面版",
  apk: "安卓版",
};

export interface ExportQuote {
  target: ExportTarget;
  billableNodes: number;
  totalNodes: number;
  pricePerNode: number;
  multiplier: number;
  finalPrice: number;
  discountApplied: boolean;
}

/** 计费节点：当前实现按项目全部节点；换视频的增量计费留给导出流水线 */
export function billableNodes(doc: ProjectDoc): number {
  return doc.scenes.length;
}

const BASELINE_GROUP: Record<ExportTarget, "web-desktop" | "apk"> = {
  web: "web-desktop",
  launcher: "web-desktop",
  desktop: "web-desktop",
  apk: "apk",
};

export function computeQuote(doc: ProjectDoc, target: ExportTarget, alreadyInGroup = false): ExportQuote {
  const nodes = billableNodes(doc);
  const multiplier = alreadyInGroup && BASELINE_GROUP[target] === "web-desktop" ? SECOND_TARGET_MULTIPLIER : 1;
  const base = nodes * PRICE_PER_NODE;
  return {
    target,
    billableNodes: nodes,
    totalNodes: doc.scenes.length,
    pricePerNode: PRICE_PER_NODE,
    multiplier,
    finalPrice: Math.round(base * multiplier),
    discountApplied: multiplier < 1,
  };
}

/** 一次列全部目标（网页版/桌面版视为同组，故第二个起打 5 折） */
export function computeAllQuotes(doc: ProjectDoc): ExportQuote[] {
  const targets: ExportTarget[] = ["web", "launcher", "desktop", "apk"];
  const seenGroup = new Set<string>();
  return targets.map((target) => {
    const group = BASELINE_GROUP[target];
    const already = seenGroup.has(group);
    seenGroup.add(group);
    return computeQuote(doc, target, already);
  });
}

export function quoteSummary(quote: ExportQuote): string {
  const discount = quote.discountApplied ? "（第二端 5 折）" : "";
  return `${TARGET_LABEL[quote.target]} · ${quote.billableNodes} 节点 × ${quote.pricePerNode} = ${quote.finalPrice} 积分${discount}`;
}
