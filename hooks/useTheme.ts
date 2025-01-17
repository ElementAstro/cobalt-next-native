import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Appearance } from "react-native";
import { useColorScheme } from "./useColorScheme";

interface ThemeContext {
  theme: string;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: string) => void;
  availableThemes: string[];
}

export const useTheme = (): ThemeContext => {
  const [theme, setThemeState] = useState<string>("system");
  const systemColorScheme = useColorScheme();
  const availableThemes = ["light", "dark", "system"];

  const resolvedTheme = theme === "system" ? (systemColorScheme || "light") : theme as "light" | "dark";

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem("@app_theme");
        if (savedTheme && availableThemes.includes(savedTheme)) {
          setThemeState(savedTheme);
        }
      } catch (error) {
        console.error("加载主题失败:", error);
      }
    };

    loadTheme();
  }, []);

  const setTheme = async (selectedTheme: string) => {
    if (!availableThemes.includes(selectedTheme)) return;
    setThemeState(selectedTheme);
    try {
      await AsyncStorage.setItem("@app_theme", selectedTheme);
    } catch (error) {
      console.error("保存主题失败:", error);
    }
  };

  return { theme, resolvedTheme, setTheme, availableThemes };
};
