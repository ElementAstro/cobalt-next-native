import * as Network from "expo-network";
import { Platform } from "react-native";

export async function checkHotspotAvailability(): Promise<boolean> {
  if (Platform.OS === "android") {
    const state = await Network.getNetworkStateAsync();
    return state.type === Network.NetworkStateType.CELLULAR;
  }
  return true;
}

export async function checkLanAvailability(): Promise<boolean> {
  const state = await Network.getNetworkStateAsync();
  return !!state.isConnected && state.type === Network.NetworkStateType.WIFI;
}