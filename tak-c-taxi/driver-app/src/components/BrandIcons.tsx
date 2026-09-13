// Vector redraws of the 3 illustrations in the onboarding design board
// (0808TAXI.pdf) — a flat-color taxi car, an analog stopwatch, and a
// driver's checkered cap. Reused across screens (onboarding, the waiting
// timer, the driver profile fallback) rather than one-off inline SVGs, so
// the same illustration style stays consistent everywhere it appears.

export function TaxiCarIcon({ size = 120 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-hidden="true">
      <ellipse cx="50" cy="78" rx="38" ry="4" fill="#1f1f1f" opacity="0.12" />
      <path
        d="M14 62c0-3 2-5 5-5l4-14c2-5 7-8 12-8h30c5 0 10 3 12 8l4 14c3 0 5 2 5 5v10c0 2-2 4-4 4h-4c-1 3-4 5-7 5s-6-2-7-5H36c-1 3-4 5-7 5s-6-2-7-5h-4c-2 0-4-2-4-4V62Z"
        fill="#f5c518"
      />
      <path d="M14 62c0-3 2-5 5-5l4-14c2-5 7-8 12-8h30c5 0 10 3 12 8l4 14" stroke="#1f1f1f" strokeWidth="1.5" fill="none" />
      <path d="M27 43l3-9c1-3 4-5 7-5h26c3 0 6 2 7 5l3 9H27Z" fill="#fffdf8" stroke="#1f1f1f" strokeWidth="1.5" />
      <path d="M27 43h46" stroke="#1f1f1f" strokeWidth="1.5" />
      <rect x="42" y="28" width="16" height="7" rx="1.5" fill="#1f1f1f" />
      <rect x="45.5" y="29.5" width="9" height="4" rx="0.5" fill="#f5c518" />
      <circle cx="30" cy="72" r="7" fill="#1f1f1f" />
      <circle cx="30" cy="72" r="2.5" fill="#e0d8c4" />
      <circle cx="70" cy="72" r="7" fill="#1f1f1f" />
      <circle cx="70" cy="72" r="2.5" fill="#e0d8c4" />
      <rect x="16" y="60" width="6" height="4" rx="1" fill="#1f1f1f" />
    </svg>
  );
}

export function StopwatchIcon({ size = 120 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-hidden="true">
      <rect x="44" y="6" width="12" height="8" rx="2" fill="#1f1f1f" />
      <rect x="47" y="2" width="6" height="6" rx="1.5" fill="#1f1f1f" />
      <circle cx="66" cy="19" r="4.5" fill="#1f1f1f" />
      <circle cx="50" cy="56" r="34" fill="#f5c518" />
      <circle cx="50" cy="56" r="27" fill="#fffdf8" />
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i * 30 * Math.PI) / 180;
        const x1 = 50 + Math.sin(angle) * 24;
        const y1 = 56 - Math.cos(angle) * 24;
        const x2 = 50 + Math.sin(angle) * 20;
        const y2 = 56 - Math.cos(angle) * 20;
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#1f1f1f" strokeWidth="1.5" />;
      })}
      <line x1="50" y1="56" x2="50" y2="38" stroke="#1f1f1f" strokeWidth="3" strokeLinecap="round" />
      <line x1="50" y1="56" x2="63" y2="56" stroke="#1f1f1f" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="50" cy="56" r="3" fill="#1f1f1f" />
    </svg>
  );
}

export function DriverCapIcon({ size = 120 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-hidden="true">
      <ellipse cx="50" cy="70" rx="34" ry="6" fill="#1f1f1f" />
      <path d="M18 70c0-14 14-24 32-24s32 10 32 24H18Z" fill="#1f1f1f" />
      <rect x="14" y="66" width="72" height="10" rx="5" fill="#1f1f1f" />
      <g clipPath="url(#capCheck)">
        <rect x="20" y="66" width="60" height="10" fill="#fffdf8" />
        {Array.from({ length: 8 }).map((_, i) => (
          <rect key={i} x={20 + i * 7.5} y={66} width="7.5" height="10" fill={i % 2 === 0 ? "#1f1f1f" : "#fffdf8"} />
        ))}
      </g>
      <defs>
        <clipPath id="capCheck">
          <rect x="20" y="66" width="60" height="10" rx="5" />
        </clipPath>
      </defs>
      <circle cx="50" cy="50" r="10" fill="#f5c518" stroke="#1f1f1f" strokeWidth="1.5" />
      <path d="M50 44v5l4 3" stroke="#1f1f1f" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}
