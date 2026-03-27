/**
 * Shared design tokens and type scale for the app.
 * Font rules: sc-title (Playfair) for page/section titles; font-mono for divider labels & numbers; default sans for body/buttons.
 */

export const RING_COLORS = {
  calories: "#E87040",
  protein: "#5CC8B0",
  fiber: "#B88CD8",
} as const;

/** Hero / card image height – same on Ideas cards and Detail hero */
export const HERO_HEIGHT_PX = 240;

// ─── Type scale ─────────────────────────────────────────────────────────────

/** Page title (main H1): Ideas, Home, Camera, Shopping list, Cookbooks, Settings, Login */
export const PAGE_TITLE_CLASS =
  "sc-title text-3xl font-semibold leading-tight tracking-tight text-[hsl(var(--foreground))]";

/** Section or card heading (e.g. "Nutrition Facts", slot titles, modal section) */
export const SECTION_TITLE_CLASS =
  "sc-title text-xl font-semibold leading-tight tracking-tight text-[hsl(var(--foreground))]";

/** Smaller section heading (drawers, list headers) */
export const SECTION_TITLE_SM_CLASS =
  "sc-title text-base font-semibold leading-tight tracking-tight text-[hsl(var(--foreground))]";

/** Hero / card title – same on Ideas cards and Detail hero */
export const HERO_TITLE_CLASS =
  "sc-title line-clamp-2 break-words text-[28px] font-semibold leading-[1.15] tracking-tight text-[hsl(var(--foreground))]";

/** Hero / card blurb – same on Ideas cards and Detail hero */
export const HERO_BLURB_CLASS =
  "line-clamp-2 break-words text-[14px] leading-relaxed text-[rgba(250,243,234,0.9)] [text-shadow:0_1px_8px_rgba(0,0,0,0.55)]";

/** Eyebrow / overline – section labels, "Detected ingredients", hero badges label */
export const EYEBROW_CLASS =
  "text-[11px] font-semibold uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]";

/** Chip/badge label – pills, hero badges, small caps (accent color when needed) */
export const CHIP_LABEL_CLASS =
  "text-[10px] font-bold uppercase tracking-[0.1em]";

/** Section divider label (e.g. PER SERVING) – font-mono */
export const DIVIDER_LABEL_CLASS =
  "font-mono text-[10px] uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]";

/** Primary body text */
export const BODY_CLASS = "text-[15px] leading-relaxed text-[hsl(var(--foreground))]";

/** Caption / secondary text */
export const CAPTION_CLASS = "text-sm text-[hsl(var(--muted-foreground))]";

/** Small caption (hints, meta) */
export const CAPTION_XS_CLASS = "text-xs text-[hsl(var(--muted-foreground))]";

/** Form label */
export const FORM_LABEL_CLASS = "text-xs font-semibold text-[hsl(var(--foreground))]";

/** Modal / sheet title */
export const MODAL_TITLE_CLASS = "sc-title text-xl font-bold leading-tight text-[hsl(var(--foreground))]";

/** Primary button text */
export const BUTTON_PRIMARY_TEXT = "text-sm font-semibold";

/** Display number – hero stats, big counters (add color in place) */
export const DISPLAY_NUMBER_CLASS =
  "tabular-nums font-black leading-none tracking-tight";

/** Hero badge – small label on hero cards (e.g. "Calories", "Share Macro") */
export const HERO_BADGE_CLASS =
  "text-[10px] font-bold uppercase tracking-wider";

/** Expand/collapse copy – use everywhere */
export const EXPAND_COPY = {
  showMore: (n: number) => `Show ${n} more`,
  showFewer: "Show fewer",
} as const;
