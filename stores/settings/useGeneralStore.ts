import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { z } from "zod";

// 类型定义
interface GeneralSettings {
  autoLanguage: boolean;
  vibration: boolean;
  sound: boolean;
  darkMode: boolean;
}

interface GeneralStore extends GeneralSettings {
  updateSetting: <K extends keyof GeneralSettings>(
    key: K,
    value: GeneralSettings[K]
  ) => void;
  resetSettings: () => void;
}

// 默认设置
const DEFAULT_SETTINGS: GeneralSettings = {
  autoLanguage: true,
  vibration: true,
  sound: true,
  darkMode: false,
};

// Zod Schema
const GeneralSettingsSchema = z
  .object({
    autoLanguage: z.boolean(),
    vibration: z.boolean(),
    sound: z.boolean(),
    darkMode: z.boolean(),
  })
  .refine((data) => {
    if (data.sound && !data.vibration) {
      throw new Error("启用声音时需要同时启用振动");
    }
    return true;
  });

// 创建 store
export const useGeneralStore = create<GeneralStore>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,

      updateSetting: (key, value) =>
        set((state) => ({
          [key]: value,
        })),

      resetSettings: () => set(DEFAULT_SETTINGS),
    }),
    {
      name: "general-settings",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
