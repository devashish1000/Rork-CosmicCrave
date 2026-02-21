type CoverTheme = { accent: string; bg: string };

const THEMES: CoverTheme[] = [
  {
    accent: "hsl(var(--ring))",
    bg: "radial-gradient(140% 120% at 20% 0%, rgba(255,255,255,0.10), transparent 55%), linear-gradient(135deg, rgba(255,128,64,0.22), rgba(0,0,0,0.0) 55%), radial-gradient(120% 120% at 80% 30%, rgba(130,80,255,0.22), transparent 55%)",
  },
  {
    accent: "hsl(195 90% 55%)",
    bg: "radial-gradient(140% 120% at 20% 0%, rgba(255,255,255,0.10), transparent 55%), linear-gradient(135deg, rgba(80,210,255,0.22), rgba(0,0,0,0.0) 55%), radial-gradient(120% 120% at 80% 30%, rgba(255,140,70,0.18), transparent 60%)",
  },
  {
    accent: "hsl(275 80% 65%)",
    bg: "radial-gradient(140% 120% at 20% 0%, rgba(255,255,255,0.10), transparent 55%), linear-gradient(135deg, rgba(170,110,255,0.20), rgba(0,0,0,0.0) 55%), radial-gradient(120% 120% at 80% 30%, rgba(80,210,255,0.16), transparent 60%)",
  },
  {
    accent: "hsl(145 70% 55%)",
    bg: "radial-gradient(140% 120% at 20% 0%, rgba(255,255,255,0.10), transparent 55%), linear-gradient(135deg, rgba(80,255,170,0.16), rgba(0,0,0,0.0) 55%), radial-gradient(120% 120% at 80% 30%, rgba(255,128,64,0.16), transparent 60%)",
  },
];

function hashStringToIndex(input: string, size: number) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % size;
}

export function getCookbookCover(seed: string, accentOverride?: string) {
  const theme = THEMES[hashStringToIndex(seed, THEMES.length)];
  const coverUrl = `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(seed)}`;
  return { ...theme, accent: accentOverride ?? theme.accent, coverUrl };
}
