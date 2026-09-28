

export interface BrandBadgeStyle {
  bg: string;
  text: string;
  border: string;
}

const BRAND_PRESETS: Record<string, BrandBadgeStyle> = {
  // Genius (Iconic Yellow & Black)
  genius: { bg: '#ffff00', text: '#000000', border: '#e6e600' },
  
  // YouTube & YouTube Music (Iconic Red & White)
  youtube: { bg: '#ff0000', text: '#ffffff', border: '#cc0000' },
  yt: { bg: '#ff0000', text: '#ffffff', border: '#cc0000' },
  'youtube music': { bg: '#ff0000', text: '#ffffff', border: '#cc0000' },
  'yt music': { bg: '#ff0000', text: '#ffffff', border: '#cc0000' },
  
  // Spotify (Iconic Green & White)
  spotify: { bg: '#1db954', text: '#ffffff', border: '#179843' },
  
  // Billboard (Iconic Black & Yellow)
  billboard: { bg: '#000000', text: '#ffff00', border: '#333333' },
  'billboard ph': { bg: '#000000', text: '#ffff00', border: '#333333' },
  'billboard philippines': { bg: '#000000', text: '#ffff00', border: '#333333' },
  
  // Arambulo Live (Vibrant Deep Indigo/Violet)
  'arambulo live': { bg: '#4f46e5', text: '#ffffff', border: '#4338ca' },
  'arambulo': { bg: '#4f46e5', text: '#ffffff', border: '#4338ca' },
  
  // Rappler (Vibrant Orange & White)
  rappler: { bg: '#ea580c', text: '#ffffff', border: '#c2410c' },
  
  // GMA / GMA Network (Classic Royal Blue)
  gma: { bg: '#0284c7', text: '#ffffff', border: '#0369a1' },
  'gma news': { bg: '#0284c7', text: '#ffffff', border: '#0369a1' },
  'gma network': { bg: '#0284c7', text: '#ffffff', border: '#0369a1' },
  
  // ABS-CBN (Red & White)
  'abs-cbn': { bg: '#dc2626', text: '#ffffff', border: '#b91c1c' },
  'abs-cbn news': { bg: '#dc2626', text: '#ffffff', border: '#b91c1c' },
  
  // Inquirer / Bandera (Navy Blue)
  inquirer: { bg: '#1e3a8a', text: '#ffffff', border: '#1d4ed8' },
  'inquirer.net': { bg: '#1e3a8a', text: '#ffffff', border: '#1d4ed8' },
  bandera: { bg: '#1e3a8a', text: '#ffffff', border: '#1d4ed8' },
  
  // Philstar / Philippine Star (Blue & Gold)
  philstar: { bg: '#0284c7', text: '#ffffff', border: '#0369a1' },
  'philippine star': { bg: '#0284c7', text: '#ffffff', border: '#0369a1' },
  
  // NME (Crimson Red)
  nme: { bg: '#e11d48', text: '#ffffff', border: '#be123c' },
  
  // Rolling Stone (Dark Red)
  'rolling stone': { bg: '#b91c1c', text: '#ffffff', border: '#991b1b' },
  
  // Wish 107.5 (Warm Orange)
  'wish 107.5': { bg: '#f97316', text: '#ffffff', border: '#ea580c' },
  wish: { bg: '#f97316', text: '#ffffff', border: '#ea580c' },
  
  // Interaksyon (Dark Crimson)
  interaksyon: { bg: '#991b1b', text: '#ffffff', border: '#7f1d1d' },
  
  // TikTok (Dark Slate & Neon Cyan)
  tiktok: { bg: '#0f172a', text: '#00f2fe', border: '#334155' },
  
  // Facebook (Iconic Blue)
  facebook: { bg: '#1877f2', text: '#ffffff', border: '#166fe5' },
  fb: { bg: '#1877f2', text: '#ffffff', border: '#166fe5' },
  
  // Instagram (Vibrant Pink / Purple)
  instagram: { bg: '#e1306c', text: '#ffffff', border: '#c13584' },
  ig: { bg: '#e1306c', text: '#ffffff', border: '#c13584' },
  
  // Threads (Dark Slate & White)
  threads: { bg: '#000000', text: '#ffffff', border: '#333333' },

  // Reddit (Orange & White)
  reddit: { bg: '#ff4500', text: '#ffffff', border: '#e03d00' },
  
  // X / Twitter (Black / Twitter Blue)
  x: { bg: '#000000', text: '#ffffff', border: '#333333' },
  twitter: { bg: '#0284c7', text: '#ffffff', border: '#0369a1' },
};

export function getWebsiteBadgeStyle(websiteName?: string | null): BrandBadgeStyle {
  if (!websiteName) {
    return { bg: '#f1f5f9', text: '#334155', border: '#cbd5e1' };
  }

  const cleanName = websiteName.trim().toLowerCase();

  // 1. Direct or partial preset lookup
  for (const [key, val] of Object.entries(BRAND_PRESETS)) {
    if (cleanName.includes(key)) {
      return val;
    }
  }

  // 2. Deterministic Hash-based HSL color generator for any unrecognized brand
  let hash = 0;
  for (let i = 0; i < cleanName.length; i++) {
    hash = cleanName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return {
    bg: `hsl(${hue}, 70%, 93%)`,
    text: `hsl(${hue}, 80%, 25%)`,
    border: `hsl(${hue}, 65%, 80%)`,
  };
}
