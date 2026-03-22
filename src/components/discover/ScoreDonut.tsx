interface ScoreDonutProps {
  score: number; // 0-10
  size?: number;
  color: string;
}

export default function ScoreDonut({ score, size = 52, color }: ScoreDonutProps) {
  const strokeWidth = 3.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(score / 10, 1);
  const offset = circumference * (1 - pct);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--divider-light)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 800ms ease-out' }}
        />
      </svg>
      <span
        className="absolute"
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: size * 0.3,
          fontWeight: 400,
          color,
        }}
      >
        {score.toFixed(1)}
      </span>
    </div>
  );
}
