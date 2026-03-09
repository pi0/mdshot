export type CSSProperties = Record<string, string | number | undefined>;

export interface Theme {
  bg: string;
  text: string;
  muted: string;
  accent: string;
  border: string;
  codeBg: string;
  codeText: string;
  blockquoteBorder: string;
  blockquoteBg: string;
  linkColor: string;
  fontFamily: string;
  monoFamily: string;
  fontSize: number;
  lineHeight: number;
  padding: number;
  width: number;
  height?: number;
  leftBorderWidth?: number;
  leftBorderColor?: string;
}

export const defaultTheme: Theme = {
  bg: "#ffffff",
  text: "#1f2328",
  muted: "#656d76",
  accent: "#0969da",
  border: "#d0d7de",
  codeBg: "#f6f8fa",
  codeText: "#0550ae",
  blockquoteBorder: "#3b82f6",
  blockquoteBg: "#f6f8fa",
  linkColor: "#0969da",
  fontFamily: "Geist",
  monoFamily: "Geist Mono",
  fontSize: 16,
  lineHeight: 1.6,
  padding: 48,
  width: 1280,
  height: undefined,
  leftBorderWidth: 6,
  leftBorderColor: "#0969da",
};

export function baseStyle(theme: Theme): CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    padding: theme.padding,
    backgroundColor: theme.bg,
    color: theme.text,
    width: theme.width,
    ...(theme.height ? { height: theme.height } : {}),
    fontFamily: theme.fontFamily,
    fontSize: theme.fontSize,
    lineHeight: theme.lineHeight,
    gap: 16,
  };
}

export function wrapperStyle(theme: Theme): CSSProperties | undefined {
  if (!theme.leftBorderWidth) return undefined;
  return {
    display: "flex",
    flexDirection: "row",
    width: theme.width + theme.leftBorderWidth,
    ...(theme.height ? { height: theme.height } : {}),
  };
}

export function leftBorderStyle(theme: Theme): CSSProperties | undefined {
  if (!theme.leftBorderWidth) return undefined;
  return {
    width: theme.leftBorderWidth,
    backgroundColor: theme.leftBorderColor ?? theme.accent,
    ...(theme.height ? { height: theme.height } : {}),
  };
}
