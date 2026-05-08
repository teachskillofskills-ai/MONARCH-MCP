// Brand marks + glyph icons for MONARCH

type MarkProps = { size?: number };

export const MonarchMark = ({ size = 24, color = "currentColor" }: MarkProps & { color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M4 19V6.2a.8.8 0 0 1 1.42-.5L12 14l6.58-8.3A.8.8 0 0 1 20 6.2V19"
      stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const Brand = {
  GoogleAds: ({ size = 24 }: MarkProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24">
      {/* Yellow leg of the A */}
      <line x1="12" y1="3.2" x2="6" y2="17.6" stroke="#FBBC04" strokeWidth="5.6" strokeLinecap="round"/>
      {/* Blue leg of the A */}
      <line x1="12" y1="3.2" x2="19.6" y2="20.4" stroke="#4285F4" strokeWidth="5.6" strokeLinecap="round"/>
      {/* Green base circle */}
      <circle cx="5.4" cy="19.6" r="3" fill="#34A853"/>
    </svg>
  ),
  GSC: ({ size = 24 }: MarkProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <rect x="2" y="6" width="13" height="3" rx="1.5" fill="#4285F4"/>
      <rect x="2" y="11" width="9" height="3" rx="1.5" fill="#FBBC04"/>
      <rect x="2" y="16" width="11" height="3" rx="1.5" fill="#34A853"/>
      <circle cx="17.5" cy="14.5" r="3.5" fill="none" stroke="#EA4335" strokeWidth="2"/>
      <path d="M20 17l3 3" stroke="#EA4335" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  GA4: ({ size = 24 }: MarkProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <rect x="16" y="3" width="5" height="18" rx="2.5" fill="#F9AB00"/>
      <rect x="9.5" y="9" width="5" height="12" rx="2.5" fill="#E37400"/>
      <circle cx="5.5" cy="18.5" r="2.5" fill="#E37400"/>
    </svg>
  ),
  Meta: ({ size = 24 }: MarkProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="metaG" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#0668E1"/>
          <stop offset="1" stopColor="#0093F2"/>
        </linearGradient>
      </defs>
      <path
        d="M 12 12 C 10 6, 3 6, 3 12 C 3 18, 10 18, 12 12 C 14 6, 21 6, 21 12 C 21 18, 14 18, 12 12 Z"
        stroke="url(#metaG)"
        strokeWidth="2.8"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  ),
  LinkedIn: ({ size = 24 }: MarkProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <rect width="24" height="24" rx="4" fill="#0A66C2"/>
      <rect x="4" y="9" width="3" height="11" fill="#fff"/>
      <circle cx="5.5" cy="6" r="1.7" fill="#fff"/>
      <path d="M10 9h3v1.5c.6-1 1.7-1.7 3.2-1.7 2.5 0 3.8 1.4 3.8 4V20h-3v-6c0-1.4-.6-2.2-1.9-2.2-1.3 0-2.1.9-2.1 2.2V20h-3z" fill="#fff"/>
    </svg>
  ),
  AWR: ({ size = 24 }: MarkProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <rect width="24" height="24" rx="4" fill="#0E2742"/>
      <path d="M5 15l4-4 3 3 7-7" stroke="#FF6A3D" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14 7h5v5" stroke="#FF6A3D" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Gemini: ({ size = 24 }: MarkProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <defs>
        <linearGradient id="geminiG" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#1C7DFF"/>
          <stop offset="0.6" stopColor="#5C8BF8"/>
          <stop offset="1" stopColor="#FBA646"/>
        </linearGradient>
      </defs>
      <path d="M12 2c.5 4.5 3 7 7 7v6c-4 0-6.5 2.5-7 7-.5-4.5-3-7-7-7V9c4 0 6.5-2.5 7-7z" fill="url(#geminiG)"/>
    </svg>
  ),
  OpenRouter: ({ size = 24 }: MarkProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <rect width="24" height="24" rx="4" fill="#0a0a0b"/>
      <circle cx="7" cy="12" r="3" fill="none" stroke="#fff" strokeWidth="1.5"/>
      <circle cx="17" cy="12" r="3" fill="none" stroke="#fff" strokeWidth="1.5"/>
      <path d="M10 12h4" stroke="#fff" strokeWidth="1.5"/>
    </svg>
  ),
  Vercel: ({ size = 24 }: MarkProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <rect width="24" height="24" rx="4" fill="#0a0a0b"/>
      <path d="M12 5l8 14H4z" fill="#fff"/>
    </svg>
  ),
  DataForSEO: ({ size = 24 }: MarkProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <rect width="24" height="24" rx="4" fill="#1565D8"/>
      <text x="12" y="16" textAnchor="middle" fontFamily="ui-sans-serif, system-ui" fontSize="9" fontWeight="700" fill="#fff">D4S</text>
    </svg>
  ),
  Plug: ({ size = 24 }: MarkProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 2v4M15 2v4"/>
      <rect x="7" y="6" width="10" height="8" rx="2"/>
      <path d="M12 14v4a3 3 0 0 0 3 3"/>
    </svg>
  ),
};

export const BRAND_KEYS = Object.keys(Brand) as (keyof typeof Brand)[];

// Lucide-like outline glyphs
const Glyph: Record<string, string[]> = {
  dashboard: ["M3 12l9-9 9 9", "M5 10v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V10"],
  grid: ["M3 3h7v7H3z", "M14 3h7v7h-7z", "M3 14h7v7H3z", "M14 14h7v7h-7z"],
  store: ["M3 7l1-3h16l1 3", "M3 7v13h18V7", "M9 12h6"],
  users: ["M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M22 21v-2a4 4 0 0 0-3-3.9", "M16 3.1A4 4 0 0 1 16 11"],
  key: ["M21 2l-2 2m-7.6 7.6a5.5 5.5 0 1 1-7.8 7.8 5.5 5.5 0 0 1 7.8-7.8z", "M15.5 7.5l3 3", "M19 5l3 3"],
  activity: ["M22 12h-4l-3 9-6-18-3 9H2"],
  settings: ["M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", "M12 1v6m0 10v6m11-11h-6m-10 0H1m17.7-7.7l-4.3 4.3m-8.8 8.8l-4.3 4.3m17.4 0l-4.3-4.3m-8.8-8.8L1.7 4.7"],
  search: ["M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14z", "M21 21l-4.3-4.3"],
  plus: ["M12 5v14", "M5 12h14"],
  arrow: ["M5 12h14", "M13 5l7 7-7 7"],
  chev: ["M9 6l6 6-6 6"],
  chevDown: ["M6 9l6 6 6-6"],
  chevUp: ["M18 15l-6-6-6 6"],
  more: ["M5 12h.01", "M12 12h.01", "M19 12h.01"],
  copy: ["M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-2", "M14 2h-8a2 2 0 0 0-2 2v14h12V4a2 2 0 0 0-2-2z"],
  check: ["M20 6L9 17l-5-5"],
  x: ["M18 6L6 18", "M6 6l12 12"],
  eye: ["M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z", "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"],
  eyeOff: ["M9.9 4.2A9 9 0 0 1 12 4c6.5 0 10 8 10 8a17 17 0 0 1-3.5 4.4M6.6 6.6A17 17 0 0 0 2 12s3.5 8 10 8a9 9 0 0 0 4.5-1.2", "M14.1 14.1a3 3 0 1 1-4.2-4.2", "M3 3l18 18"],
  refresh: ["M3 12a9 9 0 0 1 15.5-6.3L21 8", "M21 3v5h-5", "M21 12a9 9 0 0 1-15.5 6.3L3 16", "M3 21v-5h5"],
  bell: ["M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9", "M14 21a2 2 0 0 1-4 0"],
  logout: ["M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4", "M16 17l5-5-5-5", "M21 12H9"],
  shield: ["M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"],
  zap: ["M13 2L3 14h7l-1 8 10-12h-7l1-8z"],
  link: ["M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1", "M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"],
  trend: ["M3 17l6-6 4 4 8-8", "M14 7h7v7"],
  download: ["M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", "M7 10l5 5 5-5", "M12 15V3"],
  upload: ["M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", "M17 8l-5-5-5 5", "M12 3v12"],
  filter: ["M22 3H2l8 9.5V19l4 2v-8.5z"],
  globe: ["M2 12a10 10 0 1 0 20 0 10 10 0 0 0-20 0z", "M2 12h20", "M12 2c2.5 3.2 4 7 4 10s-1.5 6.8-4 10c-2.5-3.2-4-7-4-10s1.5-6.8 4-10z"],
  user: ["M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2", "M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"],
  cloud: ["M18 10a6 6 0 0 0-12 0 5 5 0 0 0-1 9.9V20h13a5 5 0 0 0 0-10z"],
  trash: ["M3 6h18", "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2", "M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"],
  edit: ["M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7", "M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z"],
  pause: ["M6 4h4v16H6z", "M14 4h4v16h-4z"],
  play: ["M5 3l14 9-14 9V3z"],
  inbox: ["M22 12h-6l-2 3h-4l-2-3H2", "M5.5 5l-3.5 7v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6L18.5 5a2 2 0 0 0-2-1h-9a2 2 0 0 0-2 1z"],
  book: ["M4 19.5A2.5 2.5 0 0 1 6.5 17H20", "M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"],
  lock: ["M5 11h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1z", "M7 11V7a5 5 0 0 1 10 0v4"],
};

export const G = ({ name, size = 18 }: { name: keyof typeof Glyph | string; size?: number }) => {
  const d = Glyph[name];
  if (!d) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {d.map((p, i) => <path key={i} d={p}/>)}
    </svg>
  );
};
