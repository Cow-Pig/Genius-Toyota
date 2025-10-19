export const ToyotaLogo = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1200 1200"
      aria-label="Toyota Logo"
      {...props}
    >
      <g fill="currentColor">
        <ellipse cx="600" cy="600" rx="360" ry="240" stroke="currentColor" strokeWidth="120" fill="none" />
        <ellipse cx="600" cy="600" rx="120" ry="360" stroke="currentColor" strokeWidth="120" fill="none" />
        <path d="M600,60 A540,540 0 0,1 600,1140 A540,540 0 0,1 600,60 M600,180 A420,420 0 0,0 600,1020 A420,420 0 0,0 600,180 Z" />
      </g>
    </svg>
  );
  