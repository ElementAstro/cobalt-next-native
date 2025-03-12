import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

// 位置配置类型
export interface LocationConfig {
  androidMapKey: string;
  iosMapKey: string;
  androidLocationKey: string;
  iosLocationKey: string;
  accuracy: "high" | "balanced" | "low";
  autoLocate: boolean;
  compassEnabled: boolean;
  realTimeNavigation: boolean;
}

// 位置信息类型
export interface LocationInfo {
  latitude: number;
  longitude: number;
  timestamp: number;
}

interface LocationStore {
  config: LocationConfig;
  location: LocationInfo | null;
  locationHistory: LocationInfo[];
  setConfig: (config: Partial<LocationConfig>) => void;
  setLocation: (location: LocationInfo) => void;
  clearLocationHistory: () => void;
  removeHistoryItem: (timestamp: number) => void;
}

// 默认配置
const DEFAULT_CONFIG: LocationConfig = {
  androidMapKey: "",
  iosMapKey: "",
  androidLocationKey: "",
  iosLocationKey: "",
  accuracy: "balanced",
  autoLocate: false,
  compassEnabled: true,
  realTimeNavigation: false,
};

export const useLocationStore = create<LocationStore>()(
  persist(
    (set) => ({
      config: DEFAULT_CONFIG,
      location: null,
      locationHistory: [],

      setConfig: (newConfig) =>
        set((state) => ({
          config: { ...state.config, ...newConfig },
        })),

      setLocation: (location) =>
        set((state) => {
          // 只保留最近的50个记录
          const newHistory = [location, ...state.locationHistory].slice(0, 50);

          return {
            location,
            locationHistory: newHistory,
          };
        }),

      clearLocationHistory: () =>
        set(() => ({
          locationHistory: [],
        })),

      removeHistoryItem: (timestamp) =>
        set((state) => ({
          locationHistory: state.locationHistory.filter(
            (item) => item.timestamp !== timestamp
          ),
        })),
    }),
    {
      name: "location-settings",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
