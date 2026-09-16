export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true" className={className}>
      <rect width="32" height="32" fill="#ff0000" />
      <text x="16" y="21.5" textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="700">
        115
      </text>
    </svg>
  );
}
