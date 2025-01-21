import { create } from "zustand";
import * as Network from "expo-network";

export interface NetworkState {
  ipAddress: string;
  networkState: {
    isConnected?: boolean;
    isInternetReachable?: boolean;
    type?: string;
  } | null;
  isAirplaneMode: boolean;
  networkSpeed: {
    download: number;
    upload: number;
    quality: number;
  } | null;
  isTestingSpeed: boolean;
  networkHistory: {
    timestamp: number;
    download: number;
    upload: number;
  }[];
  modalVisible: boolean;

  setModalVisible: (visible: boolean) => void;
  fetchNetworkInfo: () => Promise<void>;
  testNetworkSpeed: () => Promise<void>;
}

export const useNetworkStore = create<NetworkState>((set, get) => ({
  ipAddress: "",
  networkState: null,
  isAirplaneMode: false,
  networkSpeed: null,
  isTestingSpeed: false,
  networkHistory: [],
  modalVisible: false,
  error: null,
  isConnected: false,
  connectionType: null,

  setModalVisible: (visible) => set({ modalVisible: visible }),
  clearError: () => set((state) => ({ ...state, error: null })),
  setConnectionStatus: (isConnected: boolean, connectionType: string | null) =>
    set((state) => ({
      ...state,
      isConnected,
      connectionType,
    })),

  fetchNetworkInfo: async () => {
    try {
      const ip = await Network.getIpAddressAsync();
      const state = await Network.getNetworkStateAsync();
      const airplaneMode = await Network.isAirplaneModeEnabledAsync();

      set({
        ipAddress: ip,
        networkState: state,
        isAirplaneMode: airplaneMode,
        networkSpeed: null,
      });
    } catch (error) {
      console.error("获取网络信息错误:", error);
    }
  },

  testNetworkSpeed: async () => {
    set({ isTestingSpeed: true });
    try {
      const startTime = Date.now();
      const testFileUrl = "https://speedtest.com/testfile";
      await fetch(testFileUrl);
      const endTime = Date.now();

      const downloadSpeed = 100 / ((endTime - startTime) / 1000);
      const uploadSpeed = 50 / ((endTime - startTime) / 1000);
      const quality = Math.min(
        Math.round((downloadSpeed + uploadSpeed) / 2),
        100
      );

      const newSpeed = {
        download: downloadSpeed,
        upload: uploadSpeed,
        quality: quality,
      };

      set((state) => ({
        networkSpeed: newSpeed,
        networkHistory: [
          ...state.networkHistory,
          {
            timestamp: Date.now(),
            download: downloadSpeed,
            upload: uploadSpeed,
          },
        ],
      }));
    } catch (error) {
      console.error("网络速度测试失败:", error);
    } finally {
      set({ isTestingSpeed: false });
    }
  },
}));
