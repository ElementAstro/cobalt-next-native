import React, { useCallback, useMemo } from "react";
import {
  View,
  Alert as RNAlert,
  FlatList,
  useWindowDimensions,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as Notifications from "expo-notifications";
import useScannerStore from "@/stores/useScannerStore";
import { z } from "zod";
import SettingsSection from "@/components/scanner/SettingsSection";
import ScanResultItem from "@/components/scanner/ScanResultItem";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Option } from "@/components/ui/select";
import ScanButton from "@/components/scanner/ScanButton";
import AdvancedSettings from "@/components/scanner/AdvancedSettings";
import ScanHistory from "@/components/scanner/ScanHistory";

interface ScanResult {
  port: number;
  status: string;
  service?: string;
}

interface ScanHistoryItem {
  id: string;
  timestamp: Date;
  ipAddress: string;
  portRange: string;
  openPorts: number;
  totalPorts: number;
}

const ScannerSettings = React.memo(
  ({
    ipAddress,
    setIpAddress,
    portRange,
    setPortRange,
    customPortRange,
    setCustomPortRange,
    isScanning,
  }: {
    ipAddress: string;
    setIpAddress: (value: string) => void;
    portRange: string;
    setPortRange: (value: string) => void;
    customPortRange: string;
    setCustomPortRange: (value: string) => void;
    isScanning: boolean;
  }) => {
    return (
      <SettingsSection title="基本设置">
        <View className="flex-1">
          <Input
            placeholder="输入IP地址 (如: 192.168.1.1)"
            value={ipAddress}
            onChangeText={setIpAddress}
            editable={!isScanning}
            keyboardType="numeric"
            className="mb-4"
          />
          <Label htmlFor="port-range" className="text-lg mb-2">
            端口范围
          </Label>

          <Select
            value={portRange as unknown as Option}
            onValueChange={(value: Option) =>
              setPortRange(value as unknown as string)
            }
            disabled={isScanning}
          >
            <SelectTrigger id="port-range">
              <SelectValue placeholder="选择扫描端口范围" />
            </SelectTrigger>

            <SelectContent>
              <SelectGroup>
                <SelectItem value="common" label="常用端口 (1-1000)">
                  常用端口 (1-1000)
                </SelectItem>
                <SelectItem value="all" label="所有端口 (1-65535)">
                  所有端口 (1-65535)
                </SelectItem>
                <SelectItem value="custom" label="自定义">
                  自定义
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>

          {portRange === "custom" && (
            <Input
              placeholder="自定义范围 (如: 1-100,200-300)"
              value={customPortRange}
              onChangeText={setCustomPortRange}
              editable={!isScanning}
              keyboardType="numeric"
              className="mt-4"
            />
          )}
        </View>
      </SettingsSection>
    );
  }
);

ScannerSettings.displayName = "ScannerSettings";

const ScannerPage: React.FC = () => {
  const {
    ipAddress,
    portRange,
    customPortRange,
    scanSpeed,
    timeout,
    showClosedPorts,
    scanResults,
    isScanning,
    scanMethod,
    autoReconnect,
    notificationsEnabled,
    scanProgress,
    isDarkTheme,
    scanHistory,
    layout,
    startScanning,
    stopScanning,
    updateScanProgress,
    updateScanResults,
    addScanHistory,
    setPortRange,
    setCustomPortRange,
    setScanSpeed,
    setIpAddress,
    setTimeout: setTimeoutValue,
    setShowClosedPorts,
    setScanMethod,
    setAutoReconnect,
    setNotificationsEnabled,
  } = useScannerStore();

  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

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

  const sendNotification = useCallback(
    async (title: string, body: string) => {
      if (!notificationsEnabled) return;
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
        },
        trigger: null,
      });
    },
    [notificationsEnabled]
  );

  const validateInputs = useCallback(() => {
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
  }, [ipAddress, portRange, ipSchema, portRangeSchema]);

  const getPorts = useCallback((): number[] => {
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
  }, [portRange, customPortRange]);

  const scanPort = useCallback(
    async (ip: string, port: number): Promise<ScanResult> => {
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
    },
    [timeout]
  );

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
      const batchSize = isLandscape ? 20 : 10;
      const results: ScanResult[] = [];
      const totalPorts = ports.length;

      for (let i = 0; i < ports.length; i += batchSize) {
        if (!isScanning) break;

        const batch = ports.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map((port) => scanPortWithRetry(ipAddress, port))
        );
        results.push(...batchResults);
        updateScanProgress(i + batchSize, totalPorts);

        if (results.length >= 50 || i + batchSize >= ports.length) {
          updateScanResults(results);
          results.length = 0;
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      }
    },
    [
      isLandscape,
      isScanning,
      updateScanProgress,
      scanPortWithRetry,
      ipAddress,
      updateScanResults,
    ]
  );

  const startScan = useCallback(async () => {
    if (!validateInputs()) return;

    try {
      startScanning();
      await sendNotification("扫描开始", "端口扫描已启动");

      const ports = getPorts();
      await processScanBatch(ports);

      // 保存扫描历史
      addScanHistory({
        id: Date.now().toString(),
        timestamp: new Date(),
        ipAddress,
        portRange: portRange === "custom" ? customPortRange : portRange,
        openPorts: scanResults.filter((r) => r.status === "open").length,
        totalPorts: scanResults.length,
      });

      stopScanning();
      await sendNotification("扫描完成", `成功扫描了 ${ports.length} 个端口`);
    } catch (error) {
      stopScanning();
      RNAlert.alert(
        "扫描错误",
        `扫描过程中发生错误: ${
          error instanceof Error ? error.message : "未知错误"
        }`
      );
    }
  }, [
    validateInputs,
    startScanning,
    sendNotification,
    getPorts,
    processScanBatch,
    addScanHistory,
    ipAddress,
    portRange,
    customPortRange,
    scanResults,
    stopScanning,
  ]);

  const handleHistorySelect = useCallback(
    (item: ScanHistoryItem) => {
      setIpAddress(item.ipAddress);
      if (item.portRange.includes("-")) {
        setPortRange("custom");
        setCustomPortRange(item.portRange);
      } else {
        setPortRange(item.portRange);
      }
    },
    [setCustomPortRange, setIpAddress, setPortRange]
  );

  const renderHeader = useMemo(
    () => (
      <ScannerSettings
        ipAddress={ipAddress}
        setIpAddress={setIpAddress}
        portRange={portRange}
        setPortRange={setPortRange}
        customPortRange={customPortRange}
        setCustomPortRange={setCustomPortRange}
        isScanning={isScanning}
      />
    ),
    [
      ipAddress,
      setIpAddress,
      portRange,
      setPortRange,
      customPortRange,
      setCustomPortRange,
      isScanning,
    ]
  );

  const renderEmptyComponent = useCallback(() => {
    if (isScanning) return null;
    return (
      <View className="mt-4">
        <Text className="text-center text-gray-500 dark:text-gray-400">
          暂无扫描结果
        </Text>
      </View>
    );
  }, [isScanning]);

  const renderItem = useCallback(
    ({ item, index }: { item: ScanResult; index: number }) => (
      <ScanResultItem
        item={item}
        index={index}
        key={`${item.port}-${item.status}`}
      />
    ),
    []
  );

  const renderSettings = useMemo(
    () => (
      <View className={isLandscape ? "w-1/3 p-4" : "w-full p-4"}>
        <View className="space-y-4">
          {renderHeader}

          <SettingsSection title="高级设置" collapsible>
            <AdvancedSettings
              scanSpeed={scanSpeed}
              setScanSpeed={setScanSpeed}
              timeout={timeout}
              setTimeoutValue={setTimeoutValue}
              showClosedPorts={showClosedPorts}
              setShowClosedPorts={setShowClosedPorts}
              scanMethod={scanMethod}
              setScanMethod={setScanMethod}
              autoReconnect={autoReconnect}
              setAutoReconnect={setAutoReconnect}
              notificationsEnabled={notificationsEnabled}
              setNotificationsEnabled={setNotificationsEnabled}
              isScanning={isScanning}
            />
          </SettingsSection>

          <ScanButton
            isScanning={isScanning}
            onPress={startScan}
            progress={scanProgress}
          />
        </View>
      </View>
    ),
    [
      isLandscape,
      renderHeader,
      scanSpeed,
      setScanSpeed,
      timeout,
      setTimeoutValue,
      showClosedPorts,
      setShowClosedPorts,
      scanMethod,
      setScanMethod,
      autoReconnect,
      setAutoReconnect,
      notificationsEnabled,
      setNotificationsEnabled,
      isScanning,
      startScan,
      scanProgress,
    ]
  );

  const keyExtractor = useCallback(
    (_item: ScanResult, index: number) => index.toString(),
    []
  );

  const getItemLayout = useCallback(
    (_data: ArrayLike<ScanResult> | null | undefined, index: number) => ({
      length: 60, // 假设每个项的高度为60
      offset: 60 * index,
      index,
    }),
    []
  );

  const renderScanResults = useMemo(
    () => (
      <View className={`${isLandscape ? "w-2/3" : "w-full"} p-4`}>
        <FlatList
          key={layout}
          numColumns={layout === "grid" && isLandscape ? 2 : 1}
          data={filteredResults}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          className="p-4"
          ListEmptyComponent={renderEmptyComponent}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={5}
          getItemLayout={getItemLayout}
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
          }}
          columnWrapperStyle={
            layout === "grid" && isLandscape
              ? { justifyContent: "space-between" }
              : undefined
          }
        />
      </View>
    ),
    [
      isLandscape,
      layout,
      filteredResults,
      renderItem,
      keyExtractor,
      renderEmptyComponent,
      getItemLayout,
    ]
  );

  return (
    <GestureHandlerRootView
      className={`flex-1 ${isDarkTheme ? "bg-gray-900" : "bg-gray-100"}`}
    >
      <View className={`flex-1 ${isLandscape ? "flex-row" : "flex-col"}`}>
        {renderSettings}
        <View className={`${isLandscape ? "w-2/3" : "w-full"}`}>
          {scanHistory.length > 0 && (
            <View className="mb-4">
              <Label className="text-lg font-bold px-4 mb-2">最近扫描</Label>
              <ScanHistory
                history={scanHistory}
                onSelectHistory={handleHistorySelect}
              />
            </View>
          )}
          {renderScanResults}
        </View>
      </View>
    </GestureHandlerRootView>
  );
};

export default React.memo(ScannerPage);
