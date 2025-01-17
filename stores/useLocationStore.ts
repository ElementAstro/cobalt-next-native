import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface LocationConfig {
  androidMapKey: string;
  iosMapKey: string;
  androidLocationKey: string;
  iosLocationKey: string;
  autoLocate: boolean;
}

interface LocationState {
  config: LocationConfig;
  location: {
    latitude: number;
    longitude: number;
    timestamp: number;
  } | null;
  setConfig: (config: Partial<LocationConfig>) => void;
  setLocation: (location: LocationState["location"]) => void;
}

export const useLocationStore = create<LocationState>()(
  persist(
    (set) => ({
      config: {
        androidMapKey: "c52c7169e6df23490e3114330098aaac",
        iosMapKey: "186d3464209b74effa4d8391f441f14d",
        androidLocationKey: "043b24fe18785f33c491705ffe5b6935",
        iosLocationKey: "9bd6c82e77583020a73ef1af59d0c759",
        autoLocate: true,
      },
      location: null,
      setConfig: (newConfig) =>
        set((state) => ({
          config: { ...state.config, ...newConfig },
        })),
      setLocation: (location) => set({ location }),
    }),
    {
      name: "location-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
