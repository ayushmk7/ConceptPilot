export function WaveDivider({
  className = '',
  fill = 'var(--background)',
  flip = false,
}: {
  className?: string;
  fill?: string;
  flip?: boolean;
}) {
  return (
    <div
      className={`w-full overflow-hidden leading-[0] ${className}`}
      style={flip ? { transform: 'rotate(180deg)' } : undefined}
    >
      <svg
        viewBox="0 0 1440 60"
        preserveAspectRatio="none"
        className="w-full h-[40px] md:h-[60px]"
      >
        <path
          d="M0,30 C240,55 480,0 720,30 C960,60 1200,5 1440,30 L1440,60 L0,60 Z"
          fill={fill}
        />
      </svg>
    </div>
  );
}
