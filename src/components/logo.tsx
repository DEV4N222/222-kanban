export function Logo({ className, size = 24 }: { className?: string; size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static SVG, nothing for next/image to optimise
    <img src="/222-logo.svg" width={size} height={size} className={className} alt="222 Solutions" />
  );
}
