import { useColorScheme } from "react-native";

import { Colors } from "@/constants/colors";

export function useColors() {
  const scheme = useColorScheme();
  const palette = scheme === "dark" ? Colors.dark : Colors.light;
  return { ...palette, radius: Colors.radius };
}
