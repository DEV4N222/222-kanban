// Preset label colours. Each is dark enough for white text (≥ 4.5:1).
export const LABEL_COLORS: { name: string; value: string }[] = [
  { name: "Red", value: "#c62828" },
  { name: "Orange", value: "#c2410c" },
  { name: "Amber", value: "#a16207" },
  { name: "Green", value: "#15803d" },
  { name: "Teal", value: "#0f766e" },
  { name: "Blue", value: "#1d4ed8" },
  { name: "Indigo", value: "#4338ca" },
  { name: "Purple", value: "#7e22ce" },
  { name: "Pink", value: "#be185d" },
  { name: "Slate", value: "#475569" },
];

export const DEFAULT_LABEL_COLOR = LABEL_COLORS[5].value;

export function isHexColor(value: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(value);
}

// Black or white text, whichever reads better on the label colour — custom
// colours can be light.
export function labelTextColor(hex: string): string {
  if (!isHexColor(hex)) return "#ffffff";
  const channel = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
  // Contrast with white is 1.05 / (L + 0.05); with black (L + 0.05) / 0.05.
  return 1.05 / (luminance + 0.05) >= (luminance + 0.05) / 0.05 ? "#ffffff" : "#000000";
}
