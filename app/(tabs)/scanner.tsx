import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Alert as RNAlert,
  FlatList,
  useWindowDimensions,
} from "react-native";
import Slider from "@react-native-community/slider";
import { Picker } from "@react-native-picker/picker";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as Notifications from "expo-notifications";
import { z } from "zod";
import SettingsSection from "@/components/scanner/SettingsSection";
import ScanButton from "@/components/scanner/ScanButton";
import ScanResultItem from "@/components/scanner/ScanResultItem";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { Switch } from "@/components/ui/switch";

interface ScanResult {
  port: number;
  status: string;
  service?: string;
}

const ScannerPage: React.FC = () => {
  const [ipAddress, setIpAddress] = useState<string>("");
  const [portRange, setPortRange] = useState<string>("common");
  const [customPortRange, setCustomPortRange] = useState<string>("");
  const [scanSpeed, setScanSpeed] = useState<string>("normal");
  const [timeout, setTimeoutValue] = useState<number>(500);
  const [showClosedPorts, setShowClosedPorts] = useState<boolean>(false);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanMethod, setScanMethod] = useState<string>("tcp");
  const [saveResults, setSaveResults] = useState<boolean>(false);
  const [autoReconnect, setAutoReconnect] = useState<boolean>(false);
  const [notificationsEnabled, setNotificationsEnabled] =
    useState<boolean>(true);

  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const scanMethods = {
    tcp: "TCP 连接扫描",
    syn: "SYN 扫描",
    udp: "UDP 扫描",
    ack: "ACK 扫描",
  };

  const ipSchema = z
    .string()
    .regex(
      /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/,
      "无效的IP地址"
    );

  const portRangeSchema = z.string().refine((val) => {
    if (val === "custom") {
      const ranges = customPortRange.split(",");
      return ranges.every((range) => /^(\d{1,5})-(\d{1,5})$/.test(range));
    }
    return true;
  }, "自定义端口范围格式错误 (如: 1-100,200-300)");

  const sendNotification = async (title: string, body: string) => {
    if (!notificationsEnabled) return;
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
      },
      trigger: null,
    });
  };

  const validateInputs = () => {
    const ipValidation = ipSchema.safeParse(ipAddress);
    if (!ipValidation.success) {
      RNAlert.alert("输入错误", ipValidation.error.errors[0].message);
      return false;
    }

    const portRangeValidation = portRangeSchema.safeParse(portRange);
    if (!portRangeValidation.success) {
      RNAlert.alert("输入错误", portRangeValidation.error.errors[0].message);
      return false;
    }

    return true;
  };

  const getPorts = (): number[] => {
    switch (portRange) {
      case "common":
        return Array.from({ length: 1000 }, (_, i) => i + 1);
      case "all":
        return Array.from({ length: 65535 }, (_, i) => i + 1);
      case "custom":
        const ranges = customPortRange
          .split(",")
          .map((r) => r.split("-").map(Number));
        let ports: number[] = [];
        ranges.forEach(([start, end]) => {
          ports = ports.concat(
            Array.from({ length: end - start + 1 }, (_, i) => i + start)
          );
        });
        return ports;
      default:
        return [];
    }
  };

  const scanPort = async (ip: string, port: number): Promise<ScanResult> => {
    return new Promise((resolve) => {
      const timeoutHandle = setTimeout(() => {
        resolve({
          port,
          status: "closed",
          service: `${ip}:${port} - Timeout`,
        });
      }, timeout);

      // Enhanced simulated port scanning logic (20% open rate)
      const isOpen = Math.random() > 0.8;
      if (isOpen) {
        clearTimeout(timeoutHandle);
        resolve({
          port,
          status: "open",
          service: `${ip}:${port} - Service running`,
        });
      } else {
        clearTimeout(timeoutHandle);
        resolve({
          port,
          status: "closed",
          service: `${ip}:${port} - No response`,
        });
      }
    });
  };

  const filteredResults = useMemo(() => {
    return scanResults.filter((result) =>
      showClosedPorts ? true : result.status === "open"
    );
  }, [scanResults, showClosedPorts]);

  const scanPortWithRetry = useCallback(
    async (ip: string, port: number, retries = 3): Promise<ScanResult> => {
      for (let i = 0; i < retries; i++) {
        try {
          const result = await scanPort(ip, port);
          return result;
        } catch (error) {
          if (i === retries - 1 || !autoReconnect) throw error;
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
      throw new Error("Max retries reached");
    },
    [autoReconnect, scanPort]
  );

  const processScanBatch = useCallback(
    async (ports: number[]) => {
      const batchSize = 5;
      const results: ScanResult[] = [];

      for (let i = 0; i < ports.length; i += batchSize) {
        const batch = ports.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map((port) => scanPortWithRetry(ipAddress, port))
        );
        results.push(...batchResults);

        // 批量更新结果以减少渲染次数
        if (results.length >= 20 || i + batchSize >= ports.length) {
          setScanResults((prev) => [...prev, ...results]);
          results.length = 0;
        }
      }
    },
    [ipAddress, scanPortWithRetry]
  );

  const startScan = useCallback(async () => {
    if (!validateInputs()) return;

    try {
      setIsScanning(true);
      setScanResults([]);
      await sendNotification("扫描开始", "端口扫描已启动");

      const ports = getPorts();
      await processScanBatch(ports);

      setIsScanning(false);
      await sendNotification("扫描完成", `成功扫描了 ${ports.length} 个端口`);
    } catch (error) {
      setIsScanning(false);
      RNAlert.alert(
        "扫描错误",
        `扫描过程中发生错误: ${
          error instanceof Error ? error.message : "未知错误"
        }`
      );
    }
  }, [validateInputs, getPorts, processScanBatch, sendNotification]);

  const renderHeader = () => (
    <View
      className={`flex-1 ${
        isLandscape ? "flex-row flex-wrap justify-between" : ""
      }`}
    >
      <SettingsSection
        title="基本设置"
        children={
          <View className={`flex-1 ${isLandscape ? "mr-2 mb-4" : "mr-4"}`}>
            <Input
              placeholder="输入IP地址 (如: 192.168.1.1)"
              value={ipAddress}
              onChangeText={setIpAddress}
              editable={!isScanning}
              keyboardType="numeric"
              className="mb-4"
            />

            <Text className="text-lg mb-2 text-gray-700 dark:text-gray-300">
              端口范围
            </Text>
            <View className="border border-gray-300 dark:border-gray-700 rounded mb-4 bg-white dark:bg-gray-800">
              <Picker
                selectedValue={portRange}
                onValueChange={(value) => setPortRange(value)}
                enabled={!isScanning}
                style={{ height: 50 }}
              >
                <Picker.Item label="常用端口 (1-1000)" value="common" />
                <Picker.Item label="所有端口 (1-65535)" value="all" />
                <Picker.Item label="自定义" value="custom" />
              </Picker>
            </View>

            {portRange === "custom" && (
              <Input
                placeholder="自定义范围 (如: 1-100,200-300)"
                value={customPortRange}
                onChangeText={setCustomPortRange}
                editable={!isScanning}
                keyboardType="numeric"
                className="mb-4"
              />
            )}
          </View>
        }
      />

      <SettingsSection
        title="高级选项"
        children={
          <View className={`flex-1 ${isLandscape ? "mr-2 mb-4" : "mr-4"}`}>
            <Text className="text-lg mb-2 text-gray-700 dark:text-gray-300">
              扫描速度
            </Text>
            <View className="border border-gray-300 dark:border-gray-700 rounded mb-4 bg-white dark:bg-gray-800">
              <Picker
                selectedValue={scanSpeed}
                onValueChange={(value) => setScanSpeed(value)}
                enabled={!isScanning}
                style={{ height: 50 }}
              >
                <Picker.Item label="快速 (100ms)" value="fast" />
                <Picker.Item label="正常 (500ms)" value="normal" />
                <Picker.Item label="彻底 (2000ms)" value="thorough" />
              </Picker>
            </View>

            <Text className="text-lg mb-2 text-gray-700 dark:text-gray-300">
              超时设置: {timeout}毫秒
            </Text>
            <Slider
              minimumValue={100}
              maximumValue={5000}
              step={100}
              value={timeout}
              onValueChange={setTimeoutValue}
              className="mb-4"
              disabled={isScanning}
            />

            <View className="flex-row items-center mb-4">
              <Switch
                checked={showClosedPorts}
                onCheckedChange={setShowClosedPorts}
                disabled={isScanning}
              />
              <Text className="ml-2 text-gray-700 dark:text-gray-300">
                显示关闭的端口
              </Text>
            </View>
          </View>
        }
      />

      <SettingsSection
        title="扫描方法"
        children={
          <View className={`flex-1 ${isLandscape ? "mr-2 mb-4" : "mr-4"}`}>
            <Text className="text-lg mb-2 text-gray-700 dark:text-gray-300">
              扫描方法
            </Text>
            <View className="border border-gray-300 dark:border-gray-700 rounded mb-4 bg-white dark:bg-gray-800">
              <Picker
                selectedValue={scanMethod}
                onValueChange={(value) => setScanMethod(value)}
                enabled={!isScanning}
                style={{ height: 50 }}
              >
                {Object.entries(scanMethods).map(([value, label]) => (
                  <Picker.Item key={value} label={label} value={value} />
                ))}
              </Picker>
            </View>
          </View>
        }
      />

      <SettingsSection
        title="额外选项"
        children={
          <View className={`flex-1 ${isLandscape ? "mr-2 mb-4" : "mr-4"}`}>
            <View className="flex-row items-center mb-4">
              <Switch
                checked={saveResults}
                onCheckedChange={setSaveResults}
                disabled={isScanning}
              />
              <Text className="ml-2 text-gray-700 dark:text-gray-300">
                保存扫描结果
              </Text>
            </View>
            <View className="flex-row items-center mb-4">
              <Switch
                checked={autoReconnect}
                onCheckedChange={setAutoReconnect}
                disabled={isScanning}
              />
              <Text className="ml-2 text-gray-700 dark:text-gray-300">
                自动重试失败连接
              </Text>
            </View>
            <View className="flex-row items-center mb-4">
              <Switch
                checked={notificationsEnabled}
                onCheckedChange={setNotificationsEnabled}
                disabled={isScanning}
              />
              <Text className="ml-2 text-gray-700 dark:text-gray-300">
                扫描完成通知
              </Text>
            </View>
          </View>
        }
      />

      <View className={`mt-4 ${isLandscape ? "w-1/2" : "w-auto"}`}>
        <ScanButton isScanning={isScanning} onPress={startScan} />
      </View>
    </View>
  );

  const renderEmptyComponent = () => {
    if (isScanning) return null;
    return (
      <View className="mt-4">
        <Text className="text-center text-gray-500 dark:text-gray-400">
          暂无扫描结果
        </Text>
      </View>
    );
  };

  const renderItem = useCallback(
    ({ item, index }: { item: ScanResult; index: number }) => (
      <ScanResultItem item={item} index={index} />
    ),
    []
  );

  return (
    <GestureHandlerRootView className="flex-1 bg-gray-100 dark:bg-gray-900">
      <FlatList
        ListHeaderComponent={renderHeader}
        data={filteredResults}
        keyExtractor={useCallback(
          (_item: ScanResult, index: number) => index.toString(),
          []
        )}
        renderItem={renderItem}
        contentContainerStyle={""} // Removed incorrect 'p-4'
        className="p-4"
        ListEmptyComponent={renderEmptyComponent}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={5}
      />
    </GestureHandlerRootView>
  );
};

export default ScannerPage;
