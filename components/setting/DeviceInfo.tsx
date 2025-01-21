import React, { useEffect, useState, useMemo } from "react";
import {
  ActivityIndicator,
  useWindowDimensions,
  SafeAreaView,
  View,
} from "react-native";
import * as Device from "expo-device";
import * as Network from "expo-network";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
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
  HardDrive,
  Tablet,
  Phone,
  Server,
  Laptop,
  Monitor,
} from "lucide-react-native";
import { Badge } from "@/components/ui/badge";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import Toast from "react-native-toast-message";

// Zod 数据验证
const DeviceInfoSchema = z.object({
  brand: z.string().nullable(),
  manufacturer: z.string().nullable(),
  modelName: z.string().nullable(),
  osName: z.string().nullable(),
  osVersion: z.string().nullable(),
  isDevice: z.boolean(),
  deviceType: z.number().nullable(),
  deviceYearClass: z.number().nullable(),
  totalMemory: z.number().nullable(),
  deviceName: z.string().nullable(),
  designName: z.string().nullable(),
  modelId: z.string().nullable(),
  productName: z.string().nullable(),
});

const NetworkInfoSchema = z.object({
  ipAddress: z.string().nullable(),
  networkType: z.string().nullable(),
  isConnected: z.boolean(),
});

type DeviceInfo = z.infer<typeof DeviceInfoSchema>;
type NetworkInfo = z.infer<typeof NetworkInfoSchema>;

// 设备类型图标映射
const deviceTypeIcons = {
  [Device.DeviceType.PHONE]: Phone,
  [Device.DeviceType.TABLET]: Tablet,
  [Device.DeviceType.DESKTOP]: Monitor,
  [Device.DeviceType.TV]: Monitor,
  [Device.DeviceType.UNKNOWN]: Server,
};

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

  // 使用 useMemo 优化设备类型图标
  const DeviceTypeIcon = useMemo(() => {
    if (!deviceInfo.deviceType) return Cpu;
    return (
      deviceTypeIcons[deviceInfo.deviceType as keyof typeof deviceTypeIcons] ||
      Cpu
    );
  }, [deviceInfo.deviceType]);

  useEffect(() => {
    const fetchDeviceAndNetworkInfo = async () => {
      try {
        Toast.show({
          type: "info",
          text1: "加载中",
          text2: "正在获取设备信息...",
        });

        const deviceData = {
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
        const networkData = {
          ipAddress: ipAddress,
          networkType: networkState.type ?? null,
          isConnected: networkState.isConnected ?? false,
        };

        // 数据验证
        const validatedDevice = DeviceInfoSchema.parse(deviceData);
        const validatedNetwork = NetworkInfoSchema.parse(networkData);

        setDeviceInfo(validatedDevice);
        setNetworkInfo(validatedNetwork);

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
    <SafeAreaView className="flex-1">
      <View
        className={`flex-1 p-4 ${
          isLandscape ? "flex-row flex-wrap justify-between" : ""
        }`}
      >
        {/* 设备概览卡片 */}
        <Card className={isLandscape ? "w-[48%] mb-4" : "w-full mb-4"}>
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

        {/* 系统信息卡片 */}
        <Card className={isLandscape ? "w-[48%] mb-4" : "w-full mb-4"}>
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

        {/* 硬件信息卡片 */}
        <Card className={isLandscape ? "w-[48%] mb-4" : "w-full mb-4"}>
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
              icon={<DeviceTypeIcon size={20} />}
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
                  ? `${(deviceInfo.totalMemory / (1024 * 1024)).toFixed(2)} MB`
                  : "未知"
              }
              icon={<HardDrive size={20} />}
            />
          </CardContent>
        </Card>

        {/* 标识信息卡片 */}
        <Card className={isLandscape ? "w-[48%] mb-4" : "w-full mb-4"}>
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

        {/* 网络信息卡片 */}
        <Card className={isLandscape ? "w-[48%]" : "w-full"}>
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
      </View>
      <Toast />
    </SafeAreaView>
  );
};

export default DeviceScreen;
