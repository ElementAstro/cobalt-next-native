import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet } from "react-native";
import * as Device from "expo-device";

import { Collapsible } from "@/components/Collapsible";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import ParallaxScrollView from "@/components/ParallaxScrollView";
import { IconSymbol } from "@/components/ui/IconSymbol";

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

const DeviceItem = ({
  label,
  value,
}: {
  label: string;
  value: string | number | null;
}) => (
  <ThemedView className="flex-row justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
    <ThemedText className="text-base">{label}</ThemedText>
    <ThemedText className="text-base font-medium">{value ?? "未知"}</ThemedText>
  </ThemedView>
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
});

const DeviceScreen = () => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({} as DeviceInfo);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDeviceInfo = async () => {
      try {
        const info: DeviceInfo = {
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
        setDeviceInfo(info);
      } catch (err) {
        setError(err instanceof Error ? err.message : "加载设备信息失败");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDeviceInfo();
  }, []);

  if (isLoading) {
    return (
      <ThemedView className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView className="flex-1 justify-center items-center p-5">
        <ThemedText className="text-red-500 text-center">{error}</ThemedText>
      </ThemedView>
    );
  }

  return (
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
      <ThemedView className="flex-row gap-2 mb-5">
        <ThemedText type="title" className="text-2xl font-bold">
          设备信息
        </ThemedText>
      </ThemedView>

      <ThemedView className="flex-1 px-4 space-y-4">
        <Collapsible title="基本信息">
          <DeviceItem label="品牌" value={deviceInfo.brand} />
          <DeviceItem label="制造商" value={deviceInfo.manufacturer} />
          <DeviceItem label="型号" value={deviceInfo.modelName} />
        </Collapsible>

        <Collapsible title="系统信息">
          <DeviceItem label="操作系统" value={deviceInfo.osName} />
          <DeviceItem label="版本" value={deviceInfo.osVersion} />
          <DeviceItem
            label="是否是真实设备"
            value={deviceInfo.isDevice ? "是" : "否"}
          />
        </Collapsible>

        <Collapsible title="硬件信息">
          <DeviceItem label="设备类型" value={deviceInfo.deviceType} />
          <DeviceItem label="设备年份" value={deviceInfo.deviceYearClass} />
          <DeviceItem
            label="总内存"
            value={
              deviceInfo.totalMemory
                ? `${(deviceInfo.totalMemory / (1024 * 1024)).toFixed(2)} MB`
                : null
            }
          />
        </Collapsible>

        <Collapsible title="标识信息">
          <DeviceItem label="设备名称" value={deviceInfo.deviceName} />
          <DeviceItem label="设计名称" value={deviceInfo.designName} />
          <DeviceItem label="型号 ID" value={deviceInfo.modelId} />
          <DeviceItem label="产品名称" value={deviceInfo.productName} />
        </Collapsible>
      </ThemedView>
    </ParallaxScrollView>
  );
};

export default DeviceScreen;
