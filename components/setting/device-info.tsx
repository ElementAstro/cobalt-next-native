import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  ActivityIndicator,
  useWindowDimensions,
  SafeAreaView,
  ViewProps,
  ScrollView,
  View,
  Pressable,
  RefreshControl,
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
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
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
  RefreshCw,
  RefreshCcw,
  CheckCircle,
  Shield,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react-native";
import { Badge } from "~/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Alert, AlertTitle, AlertDescription } from "~/components/ui/alert";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInUp,
  Layout,
  BounceIn,
  withSpring,
  withSequence,
  withTiming,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { Text } from "~/components/ui/text";

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

// 信息脱敏处理
const maskSensitiveInfo = (info: string | null): string => {
  if (!info) return "未知";
  if (info.length <= 4) return "*".repeat(info.length);
  return `${info.slice(0, 2)}${"*".repeat(info.length - 4)}${info.slice(-2)}`;
};

interface DeviceItemProps {
  label: string;
  value: string | number | null;
  icon: LucideIcon;
  isSensitive?: boolean;
  onToggleVisibility?: () => void;
  isVisible?: boolean;
}

interface InfoCardProps extends ViewProps {
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
}

// 优化 DeviceItem 组件
const DeviceItem = ({
  label,
  value,
  icon: Icon,
  isSensitive = false,
  onToggleVisibility,
  isVisible = true,
}: DeviceItemProps) => {
  const [pressed, setPressed] = useState(false);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    setPressed(true);
    scale.value = withSpring(0.95);
  };

  const handlePressOut = () => {
    setPressed(false);
    scale.value = withSpring(1);
  };

  const displayValue =
    isSensitive && !isVisible
      ? maskSensitiveInfo(value?.toString() ?? null)
      : value ?? "未知";

  return (
    <Animated.View
      entering={FadeIn.duration(300).springify()}
      exiting={FadeOut.duration(200)}
      layout={Layout.springify()}
      style={animatedStyle}
    >
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        className={`flex-row justify-between items-center py-3 native:py-4 px-2 rounded-lg mb-2 ${
          pressed ? "bg-primary/5" : ""
        } active:bg-primary/10 transition-colors duration-200`}
      >
        <View className="flex-row items-center space-x-3 native:space-x-4">
          <View className="bg-primary/10 p-2 rounded-full">
            <Icon size={20} className="text-primary native:h-6 native:w-6" />
          </View>
          <Text className="text-base native:text-lg font-medium tracking-tight">
            {label}
          </Text>
        </View>
        <View className="flex-row items-center space-x-2">
          <Badge
            variant="secondary"
            className={`px-3 native:px-4 native:py-2 transition-transform duration-200 ${
              pressed ? "scale-95" : ""
            }`}
          >
            <Text className="text-sm native:text-base font-medium">
              {displayValue}
            </Text>
          </Badge>
          {isSensitive && (
            <Pressable
              onPress={onToggleVisibility}
              className="p-2 rounded-full bg-primary/10"
            >
              {isVisible ? (
                <EyeOff size={16} className="text-primary" />
              ) : (
                <Eye size={16} className="text-primary" />
              )}
            </Pressable>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
};

const InfoCard = ({
  title,
  description,
  children,
  className,
}: InfoCardProps) => (
  <Animated.View
    entering={SlideInUp.duration(400).springify()}
    className={`overflow-hidden ${className}`}
  >
    <Card className="native:rounded-2xl native:shadow-lg bg-gradient-to-b from-card to-background border-primary/10">
      <CardHeader className="space-y-2 native:space-y-3 native:py-4 border-b border-border/10">
        <View className="flex-row items-center space-x-3 mb-1">
          <View className="h-8 w-1 bg-primary rounded-full" />
          <CardTitle className="text-xl native:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
            {title}
          </CardTitle>
        </View>
        <CardDescription className="native:text-base text-muted-foreground/80 pl-4">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 native:space-y-3 p-4 native:p-5">
        <Animated.View
          entering={FadeIn.duration(500).springify()}
          className="rounded-lg bg-primary/5 p-0.5"
        >
          {children}
        </Animated.View>
      </CardContent>
    </Card>
  </Animated.View>
);

// 隐私政策对话框组件
const PrivacyDialog = ({
  isOpen,
  onClose,
  onAccept,
}: {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
}) => (
  <Dialog open={isOpen}>
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          隐私声明
        </DialogTitle>
        <DialogDescription>
          我们将收集以下设备信息以提供更好的服务体验：
        </DialogDescription>
      </DialogHeader>
      <View className="space-y-4 py-4">
        <Alert icon={Lock} variant="default">
          <AlertTitle>设备基本信息</AlertTitle>
          <AlertDescription>
            包括设备品牌、型号、操作系统版本等基本信息
          </AlertDescription>
        </Alert>
        <Alert icon={Shield} variant="destructive">
          <AlertTitle>网络状态信息</AlertTitle>
          <AlertDescription>包括网络连接状态、网络类型等信息</AlertDescription>
        </Alert>
      </View>
      <DialogFooter>
        <Button variant="outline" onPress={onClose}>
          <Lock className="mr-2 h-4 w-4" />
          拒绝
        </Button>
        <Button variant="default" onPress={onAccept}>
          <Shield className="mr-2 h-4 w-4" />
          同意
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
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
  const [refreshing, setRefreshing] = useState(false);
  const [showPrivacyDialog, setShowPrivacyDialog] = useState(true);
  const [hasAcceptedPrivacy, setHasAcceptedPrivacy] = useState(false);
  const [visibleSensitiveInfo, setVisibleSensitiveInfo] = useState<
    Record<string, boolean>
  >({});
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const DeviceTypeIcon = useMemo(() => {
    if (!deviceInfo.deviceType) return Cpu;
    return (
      deviceTypeIcons[deviceInfo.deviceType as keyof typeof deviceTypeIcons] ||
      Cpu
    );
  }, [deviceInfo.deviceType]);

  const toggleSensitiveInfo = (key: string) => {
    setVisibleSensitiveInfo((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const fetchInfo = useCallback(
    async (isRefreshing = false) => {
      if (!hasAcceptedPrivacy) return;

      try {
        if (!isRefreshing) {
          toast.loading("正在获取设备信息...");
        }

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

        const validatedDevice = DeviceInfoSchema.parse(deviceData);
        const validatedNetwork = NetworkInfoSchema.parse(networkData);

        setDeviceInfo(validatedDevice);
        setNetworkInfo(validatedNetwork);
        setError(null);

        if (!isRefreshing) {
          toast.success("加载完成", {
            icon: <CheckCircle size={20} className="text-success" />,
          });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "加载失败";
        if (!isRefreshing) {
          toast.error("错误", { description: message });
        }
        setError(message);
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    },
    [hasAcceptedPrivacy]
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchInfo(true);
  }, [fetchInfo]);

  const handleAcceptPrivacy = () => {
    setHasAcceptedPrivacy(true);
    setShowPrivacyDialog(false);
    fetchInfo();
  };

  useEffect(() => {
    if (hasAcceptedPrivacy) {
      fetchInfo();
    }
  }, [hasAcceptedPrivacy, fetchInfo]);

  if (!hasAcceptedPrivacy) {
    return (
      <PrivacyDialog
        isOpen={showPrivacyDialog}
        onClose={() => setShowPrivacyDialog(false)}
        onAccept={handleAcceptPrivacy}
      />
    );
  }

  if (isLoading && !refreshing) {
    return (
      <Animated.View
        entering={FadeIn.duration(300).springify()}
        className="flex-1 justify-center items-center bg-background"
      >
        <ActivityIndicator size="large" className="mb-4 native:scale-150" />
        <Text className="text-muted-foreground native:text-lg">加载中...</Text>
      </Animated.View>
    );
  }

  if (error && !refreshing) {
    return (
      <Animated.View
        entering={FadeIn.duration(300).springify()}
        className="flex-1 justify-center items-center p-6 bg-background"
      >
        <AlertCircle
          size={40}
          className="text-destructive mb-4 native:h-12 native:w-12"
        />
        <Text className="text-destructive text-center native:text-lg mb-6">
          {error}
        </Text>
        <Button
          variant="outline"
          onPress={() => fetchInfo()}
          className="flex-row items-center space-x-2 px-4 py-2 rounded-xl"
        >
          <RefreshCcw size={20} className="mr-2" />
          <Text>重试</Text>
        </Button>
      </Animated.View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#006FEE"]}
            tintColor="#006FEE"
          />
        }
      >
        <View
          className={`space-y-4 native:space-y-6 ${
            isLandscape ? "flex-row flex-wrap justify-between" : ""
          }`}
        >
          <InfoCard
            title="设备概览"
            description="基本的设备信息一览"
            className={isLandscape ? "w-[48%] mb-4" : "mb-2"}
          >
            <DeviceItem
              label="品牌"
              value={deviceInfo.brand}
              icon={Home}
              isSensitive={true}
              isVisible={visibleSensitiveInfo["brand"]}
              onToggleVisibility={() => toggleSensitiveInfo("brand")}
            />
            <DeviceItem
              label="制造商"
              value={deviceInfo.manufacturer}
              icon={Cpu}
              isSensitive={true}
              isVisible={visibleSensitiveInfo["manufacturer"]}
              onToggleVisibility={() => toggleSensitiveInfo("manufacturer")}
            />
            <DeviceItem
              label="型号"
              value={deviceInfo.modelName}
              icon={Smartphone}
              isSensitive={true}
              isVisible={visibleSensitiveInfo["modelName"]}
              onToggleVisibility={() => toggleSensitiveInfo("modelName")}
            />
          </InfoCard>

          <InfoCard
            title="系统信息"
            description="设备操作系统相关信息"
            className={isLandscape ? "w-[48%] mb-4" : "mb-2"}
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
            className={isLandscape ? "w-[48%] mb-4" : "mb-2"}
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
            title="网络信息"
            description="设备的网络相关信息"
            className={isLandscape ? "w-[48%]" : ""}
          >
            <DeviceItem
              label="IP 地址"
              value={networkInfo.ipAddress}
              icon={networkInfo.isConnected ? Wifi : WifiOff}
              isSensitive={true}
              isVisible={visibleSensitiveInfo["ipAddress"]}
              onToggleVisibility={() => toggleSensitiveInfo("ipAddress")}
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
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default DeviceScreen;
