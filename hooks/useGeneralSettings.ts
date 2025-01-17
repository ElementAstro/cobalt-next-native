import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface Settings {
  autoLanguage: boolean;
  vibration: boolean;
  sound: boolean;
  darkMode: boolean;
}

export const useGeneralSettings = () => {
  const [settings, setSettings] = useState<Settings>({
    autoLanguage: true,
    vibration: true,
    sound: true,
    darkMode: false,
  });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedSettings = await AsyncStorage.getItem("@general_settings");
        if (savedSettings) {
          setSettings(JSON.parse(savedSettings));
        }
      } catch (error) {
        console.error("加载设置失败:", error);
      }
    };

    loadSettings();
  }, []);

  const updateSetting = async (key: keyof Settings, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    try {
      await AsyncStorage.setItem(
        "@general_settings",
        JSON.stringify(newSettings)
      );
    } catch (error) {
      console.error("保存设置失败:", error);
    }
  };

  return { settings, updateSetting };
};
