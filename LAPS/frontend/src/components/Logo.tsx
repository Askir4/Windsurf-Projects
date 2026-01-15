interface LogoProps {
  className?: string;
  size?: number;
}

export function Logo({ className = '', size = 32 }: LogoProps) {
  const id = `logo-gradient-${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={id} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFB347" />
          <stop offset="50%" stopColor="#FFA500" />
          <stop offset="100%" stopColor="#E08E00" />
        </linearGradient>
        <clipPath id={`${id}-clip`}>
          <circle cx="50" cy="50" r="48" />
        </clipPath>
      </defs>
      <circle cx="50" cy="50" r="48" fill={`url(#${id})`} />
      <g fill="white" clipPath={`url(#${id}-clip)`}>
        {/* 4 Balken mit runden Köpfen - von unten nach oben */}
        {/* Balken 1 */}
        <rect x="22" y="42" width="7" height="60" />
        <circle cx="25.5" cy="42" r="7" />
        {/* Balken 2 */}
        <rect x="37" y="42" width="7" height="60" />
        <circle cx="40.5" cy="42" r="7" />
        {/* Balken 3 */}
        <rect x="52" y="42" width="7" height="60" />
        <circle cx="55.5" cy="42" r="7" />
        {/* Balken 4 */}
        <rect x="67" y="42" width="7" height="60" />
        <circle cx="70.5" cy="42" r="7" />
      </g>
    </svg>
  );
}
