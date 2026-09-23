export function Logo({ className, size = 24 }: { className?: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 40 40"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="222 Solutions"
    >
      <circle cx="22" cy="22" r="16" fill="#BE2448" />
      <circle cx="19" cy="19" r="16" fill="#000000" />
      <text
        x="19"
        y="20"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="Urbanist, system-ui, sans-serif"
        fontWeight="800"
        fontSize="14"
        fill="#FFFFFF"
      >
        222
      </text>
    </svg>
  );
}
