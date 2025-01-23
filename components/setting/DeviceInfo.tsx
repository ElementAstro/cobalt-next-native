import React, { useEffect, useState, useMemo } from "react";
import {
  ActivityIndicator,
  useWindowDimensions,
  SafeAreaView,
  ViewProps,
} from "react-native";
import * as Device from "expo-device";
import * as Network from "expo-network";
import { z } from "zod";
import { toast } from "sonner-native";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
  Monitor,
  Server,
  LucideIcon,
} from "lucide-react-native";
import { Badge } from "@/components/ui/badge";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { Text } from "@/components/ui/text";

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

interface DeviceItemProps {
  label: string;
  value: string | number | null;
  icon: LucideIcon;
}

interface InfoCardProps extends ViewProps {
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
}

const DeviceItem = ({ label, value, icon: Icon }: DeviceItemProps) => (
  <Animated.View
    entering={FadeIn}
    exiting={FadeOut}
    className="flex-row justify-between items-center py-3 border-b border-border"
  >
    <ThemedView className="flex-row items-center space-x-3">
      <Icon size={20} className="text-foreground" />
      <Text className="text-base font-medium">{label}</Text>
    </ThemedView>
    <Badge variant="secondary" className="px-3">
      <Text className="text-sm">{value ?? "未知"}</Text>
    </Badge>
  </Animated.View>
);

const InfoCard = ({
  title,
  description,
  children,
  className,
}: InfoCardProps) => (
  <Card className={`overflow-hidden ${className}`}>
    <CardHeader className="space-y-1.5">
      <CardTitle className="text-xl">{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent className="space-y-2">{children}</CardContent>
  </Card>
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
    const fetchInfo = async () => {
      try {
        toast.loading("正在获取设备信息...");

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

        toast.success("加载完成");
      } catch (err) {
        const message = err instanceof Error ? err.message : "加载失败";
        toast.error("错误", { description: message });
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInfo();
  }, []);

  if (isLoading) {
    return (
      <ThemedView className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" className="mb-4" />
        <Text className="text-muted-foreground">加载中...</Text>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView className="flex-1 justify-center items-center p-6">
        <AlertCircle size={40} className="text-destructive mb-4" />
        <Text className="text-destructive text-center">{error}</Text>
      </ThemedView>
    );
  }

  const cardStyles = isLandscape ? "w-[48%] mb-4" : "w-full mb-4";

  return (
    <SafeAreaView className="flex-1">
      <ThemedView
        className={`flex-1 p-4 ${
          isLandscape ? "flex-row flex-wrap justify-between" : ""
        }`}
      >
        <InfoCard
          title="设备概览"
          description="基本的设备信息一览"
          className={cardStyles}
        >
          <DeviceItem label="品牌" value={deviceInfo.brand} icon={Home} />
          <DeviceItem
            label="制造商"
            value={deviceInfo.manufacturer}
            icon={Cpu}
          />
          <DeviceItem
            label="型号"
            value={deviceInfo.modelName}
            icon={Smartphone}
          />
        </InfoCard>

        <InfoCard
          title="系统信息"
          description="设备操作系统相关信息"
          className={cardStyles}
        >
          <DeviceItem
            label="操作系统"
            value={deviceInfo.osName}
            icon={MemoryStick}
          />
          <DeviceItem label="版本" value={deviceInfo.osVersion} icon={Info} />
          <DeviceItem
            label="是否是真实设备"
            value={deviceInfo.isDevice ? "是" : "否"}
            icon={Smartphone}
          />
        </InfoCard>

        <InfoCard
          title="硬件信息"
          description="设备硬件相关信息"
          className={cardStyles}
        >
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
            icon={DeviceTypeIcon}
          />
          <DeviceItem
            label="设备年份"
            value={deviceInfo.deviceYearClass}
            icon={Home}
          />
          <DeviceItem
            label="总内存"
            value={
              deviceInfo.totalMemory
                ? `${(deviceInfo.totalMemory / (1024 * 1024)).toFixed(2)} MB`
                : "未知"
            }
            icon={HardDrive}
          />
        </InfoCard>

        <InfoCard
          title="标识信息"
          description="设备的标识相关信息"
          className={cardStyles}
        >
          <DeviceItem
            label="设备名称"
            value={deviceInfo.deviceName}
            icon={Smartphone}
          />
          <DeviceItem
            label="设计名称"
            value={deviceInfo.designName}
            icon={Home}
          />
          <DeviceItem label="型号 ID" value={deviceInfo.modelId} icon={Cpu} />
          <DeviceItem
            label="产品名称"
            value={deviceInfo.productName}
            icon={Home}
          />
        </InfoCard>

        <InfoCard
          title="网络信息"
          description="设备的网络相关信息"
          className={cardStyles}
        >
          <DeviceItem
            label="IP 地址"
            value={networkInfo.ipAddress}
            icon={networkInfo.isConnected ? Wifi : WifiOff}
          />
          <DeviceItem
            label="网络类型"
            value={networkInfo.networkType}
            icon={networkInfo.isConnected ? Signal : AlertCircle}
          />
          <DeviceItem
            label="是否连接"
            value={networkInfo.isConnected ? "已连接" : "未连接"}
            icon={networkInfo.isConnected ? Wifi : WifiOff}
          />
        </InfoCard>
      </ThemedView>
    </SafeAreaView>
  );
};

export default DeviceScreen;
