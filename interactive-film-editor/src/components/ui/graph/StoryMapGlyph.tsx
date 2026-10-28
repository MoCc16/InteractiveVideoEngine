/**
 * 故事线缩略图（视觉原语）：唯一允许出现 <svg> 的地方之一（与 icons / EdgeLayer 同列）。
 */
const POINTS: Array<[number, number]> = [
  [20, 180],
  [120, 120],
  [210, 150],
  [300, 70],
  [380, 40],
];

export function StoryMapGlyph() {
  return (
    <svg viewBox="0 0 400 220" preserveAspectRatio="none" aria-hidden="true">
      <path d="M20 180 L120 120 L210 150 L300 70 L380 40" fill="none" stroke="#c9a84c" strokeWidth="1.5" opacity="0.7" />
      {POINTS.map(([cx, cy], index) => (
        <circle
          key={`${cx}-${cy}`}
          cx={cx}
          cy={cy}
          r={index === POINTS.length - 1 ? 6 : 4}
          fill={index === POINTS.length - 1 ? "#f0d060" : "#ffffff73"}
        />
      ))}
    </svg>
  );
}
