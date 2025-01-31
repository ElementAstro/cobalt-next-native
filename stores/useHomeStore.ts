import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

interface AppState {
  isFullscreen: boolean
  currentDevice: string
  setFullscreen: (value: boolean) => void
  setCurrentDevice: (device: string) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      isFullscreen: false,
      currentDevice: 'responsive',
      setFullscreen: (value) => set({ isFullscreen: value }),
      setCurrentDevice: (device) => set({ currentDevice: device }),
    }),
    {
      name: 'app-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
