import { create } from "zustand";
import { persist } from "zustand/middleware";

interface Manifest {
  version: string;
  [key: string]: any;
}

interface UpdateState {
  isChecking: boolean;
  isDownloading: boolean;
  downloadProgress: number;
  lastCheckTime: number | null;
  error: string | null;
  currentlyRunning: {
    runtimeVersion: string;
  };
  available: {
    runtimeVersion: string;
    manifest: Manifest;
  } | null;
  setChecking: (checking: boolean) => void;
  setDownloading: (downloading: boolean) => void;
  setProgress: (progress: number) => void;
  setError: (error: string | null) => void;
  setLastCheckTime: (time: number) => void;
  setAvailableUpdate: (update: { runtimeVersion: string; manifest: Manifest }) => void;
}

export const useUpdateStore = create<UpdateState>()(
  persist(
    (set) => ({
      isChecking: false,
      isDownloading: false,
      downloadProgress: 0,
      lastCheckTime: null,
      error: null,
      currentlyRunning: {
        runtimeVersion: "1.0.0"
      },
      available: null,
      setChecking: (checking) => set({ isChecking: checking }),
      setDownloading: (downloading) => set({ isDownloading: downloading }),
      setProgress: (progress) => set({ downloadProgress: progress }),
      setError: (error) => set({ error }),
      setLastCheckTime: (time) => set({ lastCheckTime: time }),
      setAvailableUpdate: (update) => set({ available: update })
    }),
    {
      name: "update-storage",
    }
  )
);