import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface ScanResult {
  port: number;
  status: string;
  service?: string;
}

export interface ScanHistoryItem {
  id: string;
  timestamp: Date;
  ipAddress: string;
  portRange: string;
  openPorts: number;
  totalPorts: number;
}

interface ScannerState {
  // 基本设置
  ipAddress: string;
  portRange: string;
  customPortRange: string;

  // 扫描状态
  isScanning: boolean;
  scanProgress: number;
  scanResults: ScanResult[];
  scanHistory: ScanHistoryItem[];

  // 高级设置
  scanSpeed: string;
  timeout: number;
  showClosedPorts: boolean;
  scanMethod: string;
  autoReconnect: boolean;
  notificationsEnabled: boolean;

  // UI状态
  layout: "grid" | "list";
  isDarkTheme: boolean;

  // Actions
  setIpAddress: (value: string) => void;
  setPortRange: (value: string) => void;
  setCustomPortRange: (value: string) => void;
  setScanSpeed: (value: string) => void;
  setTimeout: (value: number) => void;
  setShowClosedPorts: (value: boolean) => void;
  setScanMethod: (value: string) => void;
  setAutoReconnect: (value: boolean) => void;
  setNotificationsEnabled: (value: boolean) => void;
  setLayout: (value: "grid" | "list") => void;
  setIsDarkTheme: (value: boolean) => void;

  // 扫描相关actions
  startScanning: () => void;
  stopScanning: () => void;
  updateScanProgress: (progress: number, total: number) => void;
  updateScanResults: (results: ScanResult[]) => void;
  addScanHistory: (item: ScanHistoryItem) => void;
  clearScanResults: () => void;
  clearScanHistory: () => void;
}

const useScannerStore = create<ScannerState>()(
  persist(
    (set, get) => ({
      // 初始状态
      ipAddress: "",
      portRange: "common",
      customPortRange: "",
      isScanning: false,
      scanProgress: 0,
      scanResults: [],
      scanHistory: [],
      scanSpeed: "normal",
      timeout: 500,
      showClosedPorts: false,
      scanMethod: "tcp",
      autoReconnect: false,
      notificationsEnabled: true,
      layout: "list",
      isDarkTheme: false,

      // Actions
      setIpAddress: (value) => set({ ipAddress: value }),
      setPortRange: (value) => set({ portRange: value }),
      setCustomPortRange: (value) => set({ customPortRange: value }),
      setScanSpeed: (value) => set({ scanSpeed: value }),
      setTimeout: (value) => set({ timeout: value }),
      setShowClosedPorts: (value) => set({ showClosedPorts: value }),
      setScanMethod: (value) => set({ scanMethod: value }),
      setAutoReconnect: (value) => set({ autoReconnect: value }),
      setNotificationsEnabled: (value) => set({ notificationsEnabled: value }),
      setLayout: (value) => set({ layout: value }),
      setIsDarkTheme: (value) => set({ isDarkTheme: value }),

      // 扫描控制
      startScanning: () => set({ isScanning: true, scanResults: [] }),
      stopScanning: () => set({ isScanning: false }),
      updateScanProgress: (progress, total) =>
        set({ scanProgress: progress / total }),
      updateScanResults: (results) =>
        set((state) => {
          const uniqueResults = new Map(
            state.scanResults.map((r) => [r.port, r])
          );
          results.forEach((r) => uniqueResults.set(r.port, r));
          return { scanResults: Array.from(uniqueResults.values()) };
        }),
      addScanHistory: (item) =>
        set((state) => ({
          scanHistory: [item, ...state.scanHistory.slice(0, 9)],
        })),
      clearScanResults: () => set({ scanResults: [] }),
      clearScanHistory: () => set({ scanHistory: [] }),
    }),
    {
      name: "scanner-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export default useScannerStore;
