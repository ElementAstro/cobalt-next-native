import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface HomeState {
  isFullscreen: boolean;
  currentDevice: string;
  ipAddress: string;
  port: string;
  setFullscreen: (value: boolean) => void;
  setCurrentDevice: (device: string) => void;
  setIpAddress: (ip: string) => void;
  setPort: (port: string) => void;
}

export const useHomeStore = create<HomeState>()(
  persist(
    (set) => ({
      isFullscreen: false,
      currentDevice: "responsive",
      ipAddress: "10.42.0.1",
      port: "8080",
      setFullscreen: (value) => set({ isFullscreen: value }),
      setCurrentDevice: (device) => set({ currentDevice: device }),
      setIpAddress: (ip) => set({ ipAddress: ip }),
      setPort: (port) => set({ port: port }),
    }),
    {
      name: "home-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
