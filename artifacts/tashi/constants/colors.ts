const palette = {
  primary: "#E87722",
  primaryDark: "#C5611A",
  secondary: "#1A1A1A",
  white: "#FFFFFF",
  black: "#000000",
  background: "#F8F8F8",
  card: "#FFFFFF",
  border: "#E5E5E5",
  text: "#1A1A1A",
  textSecondary: "#666666",
  textLight: "#999999",
  success: "#27AE60",
  error: "#E74C3C",
  warning: "#F39C12",
  adminBg: "#FFFFFF",
  adminCard: "#F5F5F5",
  adminText: "#1A1A1A",
  adminAccent: "#E87722",
  tint: "#E87722",
  tabIconDefault: "#999999",
  roles: {
    admin: "#8B5CF6",
    salesman: "#3B82F6",
    mechanic: "#F59E0B",
    retailer: "#E87722",
  },
} as const;

export const Colors = {
  ...palette,
  light: palette,
  dark: {
    ...palette,
    background: "#121212",
    card: "#1E1E1E",
    border: "#333333",
    text: "#F5F5F5",
    textSecondary: "#AAAAAA",
    textLight: "#777777",
    tabIconDefault: "#777777",
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
  },
};

export default Colors;
