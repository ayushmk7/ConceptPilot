export function ConceptGraphIcon({
  className = '',
  size = 32,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="3.5" stroke="currentColor" strokeWidth="2" />
      <circle cx="24" cy="8" r="3.5" stroke="currentColor" strokeWidth="2" />
      <circle cx="16" cy="24" r="3.5" fill="#FFCB05" stroke="currentColor" strokeWidth="2" />
      <line x1="10.5" y1="10" x2="14" y2="21.5" stroke="currentColor" strokeWidth="1.5" />
      <line x1="21.5" y1="10" x2="18" y2="21.5" stroke="currentColor" strokeWidth="1.5" />
      <line x1="11.5" y1="8" x2="20.5" y2="8" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
