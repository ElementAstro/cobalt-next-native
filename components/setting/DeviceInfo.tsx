import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import * as Device from "expo-device";
import * as Network from "expo-network";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import ParallaxScrollView from "@/components/ParallaxScrollView";
import { IconSymbol } from "@/components/ui/IconSymbol";
import {
  Home,
  Cpu,
  MemoryStick,
  Smartphone,
  Wifi,
  Signal,
  WifiOff,
  AlertCircle,
  Info,
} from "lucide-react-native";
import { Badge } from "@/components/ui/badge";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import Toast from "react-native-toast-message";

interface DeviceInfo {
  brand: string | null;
  manufacturer: string | null;
  modelName: string | null;
  osName: string | null;
  osVersion: string | null;
  isDevice: boolean;
  deviceType: number | null;
  deviceYearClass: number | null;
  totalMemory: number | null;
  deviceName: string | null;
  designName: string | null;
  modelId: string | null;
  productName: string | null;
}

interface NetworkInfo {
  ipAddress: string | null;
  networkType: string | null;
  isConnected: boolean;
}

const DeviceItem = ({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number | null;
  icon: React.ReactNode;
}) => (
  <Animated.View entering={FadeIn} exiting={FadeOut}>
    <ThemedView className="flex-row justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
      <ThemedView className="flex-row items-center">
        {icon}
        <ThemedText className="text-base ml-2">{label}</ThemedText>
      </ThemedView>
      <Badge variant="secondary">
        <ThemedText>{value ?? "未知"}</ThemedText>
      </Badge>
    </ThemedView>
  </Animated.View>
);

const styles = StyleSheet.create({
  iconStyle: {
    position: "absolute",
    bottom: -90,
    left: -35,
  },
  collapsibleStyle: {
    padding: 16,
    borderRadius: 8,
  },
  landscapeContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  card: {
    width: "48%",
    marginBottom: 16,
  },
});

const DeviceScreen = () => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({} as DeviceInfo);
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo>({
    ipAddress: null,
    networkType: null,
    isConnected: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  useEffect(() => {
    const fetchDeviceAndNetworkInfo = async () => {
      try {
        Toast.show({
          type: "info",
          text1: "加载中",
          text2: "正在获取设备信息...",
        });

        const deviceData: DeviceInfo = {
          brand: Device.brand,
          manufacturer: Device.manufacturer,
          modelName: Device.modelName,
          osName: Device.osName,
          osVersion: Device.osVersion,
          isDevice: Device.isDevice,
          deviceType: await Device.getDeviceTypeAsync(),
          deviceYearClass: Device.deviceYearClass,
          totalMemory: Device.totalMemory,
          deviceName: Device.deviceName,
          designName: Device.designName,
          modelId: Device.modelId,
          productName: Device.productName,
        };

        const networkState = await Network.getNetworkStateAsync();
        const ipAddress = await Network.getIpAddressAsync();
        const networkData: NetworkInfo = {
          ipAddress: ipAddress,
          networkType: networkState.type ?? null,
          isConnected: networkState.isConnected ?? false,
        };

        setDeviceInfo(deviceData);
        setNetworkInfo(networkData);

        Toast.hide();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "加载设备信息失败";
        setError(errorMessage);
        Toast.show({
          type: "error",
          text1: "错误",
          text2: errorMessage,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchDeviceAndNetworkInfo();
  }, []);

  if (isLoading) {
    return (
      <ThemedView className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" />
        <Toast />
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView className="flex-1 justify-center items-center p-5">
        <ThemedText className="text-red-500 text-center">{error}</ThemedText>
        <Toast />
      </ThemedView>
    );
  }

  return (
    <>
      <ParallaxScrollView
        headerBackgroundColor={{ light: "#D0D0D0", dark: "#353636" }}
        headerImage={
          <IconSymbol
            size={310}
            color="#808080"
            name="iphone"
            style={styles.iconStyle}
          />
        }
      >
        <ThemedView className="flex-row gap-2 mb-5 px-4">
          <ThemedText type="title" className="text-2xl font-bold">
            设备信息
          </ThemedText>
        </ThemedView>

        <ThemedView style={isLandscape ? styles.landscapeContainer : {}}>
          <Card
            style={isLandscape ? styles.card : undefined}
            className={!isLandscape ? "mx-4 mb-4" : undefined}
          >
            <CardHeader>
              <CardTitle>设备概览</CardTitle>
              <CardDescription>基本的设备信息一览</CardDescription>
            </CardHeader>
            <CardContent>
              <DeviceItem
                label="品牌"
                value={deviceInfo.brand}
                icon={<Home size={20} />}
              />
              <DeviceItem
                label="制造商"
                value={deviceInfo.manufacturer}
                icon={<Cpu size={20} />}
              />
              <DeviceItem
                label="型号"
                value={deviceInfo.modelName}
                icon={<Smartphone size={20} />}
              />
            </CardContent>
          </Card>

          <Card
            style={isLandscape ? styles.card : undefined}
            className={!isLandscape ? "mx-4 mb-4" : undefined}
          >
            <CardHeader>
              <CardTitle>系统信息</CardTitle>
              <CardDescription>设备操作系统相关信息</CardDescription>
            </CardHeader>
            <CardContent>
              <DeviceItem
                label="操作系统"
                value={deviceInfo.osName}
                icon={<MemoryStick size={20} />}
              />
              <DeviceItem
                label="版本"
                value={deviceInfo.osVersion}
                icon={<Info size={20} />}
              />
              <DeviceItem
                label="是否是真实设备"
                value={deviceInfo.isDevice ? "是" : "否"}
                icon={<Smartphone size={20} />}
              />
            </CardContent>
          </Card>
        </ThemedView>

        <ThemedView style={isLandscape ? styles.landscapeContainer : {}}>
          <Card
            style={isLandscape ? styles.card : undefined}
            className={!isLandscape ? "mx-4 mb-4" : undefined}
          >
            <CardHeader>
              <CardTitle>硬件信息</CardTitle>
              <CardDescription>设备硬件相关信息</CardDescription>
            </CardHeader>
            <CardContent>
              <DeviceItem
                label="设备类型"
                value={
                  deviceInfo.deviceType !== null
                    ? deviceInfo.deviceType === Device.DeviceType.PHONE
                      ? "手机"
                      : deviceInfo.deviceType === Device.DeviceType.TABLET
                      ? "平板"
                      : "其他"
                    : "未知"
                }
                icon={<Cpu size={20} />}
              />
              <DeviceItem
                label="设备年份"
                value={deviceInfo.deviceYearClass}
                icon={<Home size={20} />}
              />
              <DeviceItem
                label="总内存"
                value={
                  deviceInfo.totalMemory
                    ? `${(deviceInfo.totalMemory / (1024 * 1024)).toFixed(
                        2
                      )} MB`
                    : "未知"
                }
                icon={<MemoryStick size={20} />}
              />
            </CardContent>
          </Card>

          <Card
            className={!isLandscape ? "mx-4 mb-4" : undefined}
            style={isLandscape ? styles.card : undefined}
          >
            <CardHeader>
              <CardTitle>标识信息</CardTitle>
              <CardDescription>设备的标识相关信息</CardDescription>
            </CardHeader>
            <CardContent>
              <DeviceItem
                label="设备名称"
                value={deviceInfo.deviceName}
                icon={<Smartphone size={20} />}
              />
              <DeviceItem
                label="设计名称"
                value={deviceInfo.designName}
                icon={<Home size={20} />}
              />
              <DeviceItem
                label="型号 ID"
                value={deviceInfo.modelId}
                icon={<Cpu size={20} />}
              />
              <DeviceItem
                label="产品名称"
                value={deviceInfo.productName}
                icon={<Home size={20} />}
              />
            </CardContent>
          </Card>
        </ThemedView>

        <ThemedView style={isLandscape ? styles.landscapeContainer : {}}>
          <Card
            className="mx-4 mb-4"
            style={isLandscape ? styles.card : undefined}
          >
            <CardHeader>
              <CardTitle>网络信息</CardTitle>
              <CardDescription>设备的网络相关信息</CardDescription>
            </CardHeader>
            <CardContent>
              <DeviceItem
                label="IP 地址"
                value={networkInfo.ipAddress}
                icon={
                  networkInfo.isConnected ? (
                    <Wifi size={20} />
                  ) : (
                    <WifiOff size={20} />
                  )
                }
              />
              <DeviceItem
                label="网络类型"
                value={networkInfo.networkType}
                icon={
                  networkInfo.isConnected ? (
                    <Signal size={20} />
                  ) : (
                    <AlertCircle size={20} />
                  )
                }
              />
              <DeviceItem
                label="是否连接"
                value={networkInfo.isConnected ? "已连接" : "未连接"}
                icon={
                  networkInfo.isConnected ? (
                    <Wifi size={20} />
                  ) : (
                    <WifiOff size={20} />
                  )
                }
              />
            </CardContent>
          </Card>
        </ThemedView>
      </ParallaxScrollView>
      <Toast />
    </>
  );
};

export default DeviceScreen;
