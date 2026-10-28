/** 相对时间：刚刚 / N 分钟前 / N 小时前 / N 天前 / 日期 */
export function formatRelative(iso: string | undefined, now = Date.now()): string {
  if (!iso) return "未知时间";
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return "未知时间";
  const diff = Math.max(0, now - time);
  const minute = 60_000;
  if (diff < minute) return "刚刚";
  if (diff < 60 * minute) return `${Math.floor(diff / minute)} 分钟前`;
  if (diff < 24 * 60 * minute) return `${Math.floor(diff / (60 * minute))} 小时前`;
  if (diff < 30 * 24 * 60 * minute) return `${Math.floor(diff / (24 * 60 * minute))} 天前`;
  return new Date(iso).toLocaleDateString("zh-CN");
}