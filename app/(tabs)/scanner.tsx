import React, { useCallback, useMemo, useEffect, useRef } from "react";
import {
  View,
  Alert as RNAlert,
  useWindowDimensions,
  ScrollView,
  Pressable,
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
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Option } from "@/components/ui/select";
import ScanButton from "@/components/scanner/ScanButton";
import AdvancedSettings from "@/components/scanner/AdvancedSettings";
import ScanHistory from "@/components/scanner/ScanHistory";
import Animated, { FadeIn } from "react-native-reanimated";
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from "react-native-draggable-flatlist";
import type { ScanResult, ScanHistoryItem } from "@/stores/useScannerStore";

const ScannerSettings = React.memo(
  ({ isScanning }: { isScanning: boolean }) => {
    const {
      ipAddress,
      portRange,
      customPortRange,
      setIpAddress,
      setPortRange, 
      setCustomPortRange
    } = useScannerStore();

    return (
      <SettingsSection title="基本设置" className="pb-2 w-full text-white">
        <View className="space-y-4">
          <View>
            <Label
              htmlFor="ip-address"
              className="text-base font-medium mb-1.5"
            >
              IP 地址
            </Label>
            <Input
              id="ip-address"
              placeholder="输入IP地址 (如: 192.168.1.1)"
              value={ipAddress}
              onChangeText={setIpAddress}
              editable={!isScanning}
              keyboardType="numeric"
              className="h-10"
            />
          </View>

          <View>
            <Label
              htmlFor="port-range"
              className="text-base font-medium mb-1.5"
            >
              端口范围
            </Label>
            <Select
              value={portRange as unknown as Option}
              onValueChange={(value: Option) =>
                setPortRange(value as unknown as string)
              }
              disabled={isScanning}
            >
              <SelectTrigger id="port-range" className="h-10">
                <SelectValue placeholder="选择扫描端口范围" />
              </SelectTrigger>

              <SelectContent>
                <SelectGroup>
                  <SelectItem
                    value="common"
                    className="h-10 flex items-center"
                    label="常用端口 (1-1000)"
                  />
                  <SelectItem
                    value="all"
                    className="h-10 flex items-center"
                    label="所有端口 (1-65535)"
                  ></SelectItem>
                  <SelectItem
                    value="custom"
                    className="h-10 flex items-center"
                    label="自定义"
                  />
                </SelectGroup>
              </SelectContent>
            </Select>

            {portRange === "custom" && (
              <View className="mt-4">
                <Label
                  htmlFor="custom-range"
                  className="text-base font-medium mb-1.5"
                >
                  自定义范围
                </Label>
                <Input
                  id="custom-range"
                  placeholder="如: 1-100,200-300"
                  value={customPortRange}
                  onChangeText={setCustomPortRange}
                  editable={!isScanning}
                  keyboardType="numeric"
                  className="h-10"
                />
              </View>
            )}
          </View>
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
    scanMethod,
    autoReconnect, 
    notificationsEnabled,
    isScanning,
    scanResults,
    scanProgress,
    scanHistory,
    layout,
    setIpAddress,
    setPortRange,
    setCustomPortRange,
    startScanning,
    stopScanning,
    updateScanProgress,
    updateScanResults,
    addScanHistory,
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

        // 根据不同的扫描方式实现不同的扫描逻辑
        const implementScan = () => {
          switch(scanMethod) {
            case 'tcp':
              return Math.random() > 0.8; // 模拟 TCP 扫描
            case 'syn':
              return Math.random() > 0.85; // 模拟 SYN 扫描 
            case 'udp':
              return Math.random() > 0.9; // 模拟 UDP 扫描
            case 'ack':  
              return Math.random() > 0.95; // 模拟 ACK 扫描
            default:
              return Math.random() > 0.8;
          }
        };

        const isOpen = implementScan();
        clearTimeout(timeoutHandle);
        
        resolve({
          port,
          status: isOpen ? "open" : "closed",
          service: isOpen ? `${ip}:${port} - Service running` : `${ip}:${port} - No response`,
        });
      });
    },
    [timeout, scanMethod]
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

  const scanAbortController = useRef<AbortController | null>(null);

  useEffect(() => {
    // 清理函数
    return () => {
      if (scanAbortController.current) {
        scanAbortController.current.abort();
      }
    };
  }, []);

  const processScanBatch = useCallback(
    async (ports: number[]) => {
      scanAbortController.current = new AbortController();
      const signal = scanAbortController.current.signal;

      try {
        const batchSize = isLandscape ? 20 : 10;
        const results: ScanResult[] = [];
        const totalPorts = ports.length;

        for (let i = 0; i < ports.length; i += batchSize) {
          if (signal.aborted || !isScanning) break;

          const batch = ports.slice(i, i + batchSize);
          const batchResults = await Promise.all(
            batch.map((port) => scanPortWithRetry(ipAddress, port))
          );

          if (!signal.aborted) {
            results.push(...batchResults);
            updateScanProgress(i + batchSize, totalPorts);

            if (results.length >= 50 || i + batchSize >= ports.length) {
              updateScanResults(results);
              results.length = 0;
              await new Promise((resolve) => setTimeout(resolve, 10));
            }
          }
        }
      } catch (error) {
        if (!signal.aborted) {
          throw error;
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
      // 清理之前的扫描
      if (scanAbortController.current) {
        scanAbortController.current.abort();
      }

      startScanning();
      await sendNotification("扫描开始", "端口扫描已启动");

      const ports = getPorts();
      await processScanBatch(ports);

      if (!scanAbortController.current?.signal.aborted) {
        const openPorts = scanResults.filter((r) => r.status === "open").length;

        addScanHistory({
          id: Date.now().toString(),
          timestamp: new Date(),
          ipAddress,
          portRange: portRange === "custom" ? customPortRange : portRange,
          openPorts,
          totalPorts: scanResults.length,
        });

        stopScanning();
        await sendNotification("扫描完成", `成功扫描了 ${ports.length} 个端口`);
      }
    } catch (error) {
      if (!scanAbortController.current?.signal.aborted) {
        stopScanning();
        RNAlert.alert(
          "扫描错误",
          `扫描过程中发生错误: ${
            error instanceof Error ? error.message : "未知错误"
          }`
        );
      }
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
      <ScannerSettings isScanning={isScanning} />
    ),
    [isScanning]
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
    ({ item, drag, isActive, getIndex }: RenderItemParams<ScanResult>) => (
      <ScaleDecorator>
        <Animated.View
          style={[isActive && { backgroundColor: "rgba(0,0,0,0.1)" }]}
        >
          <Pressable onLongPress={drag}>
            <ScanResultItem
              item={item}
              index={getIndex() || 0}
              key={`${item.port}-${item.status}`}
            />
          </Pressable>
        </Animated.View>
      </ScaleDecorator>
    ),
    []
  );

  const onDragEnd = useCallback(
    ({ data }: { data: ScanResult[] }) => {
      updateScanResults(data);
    },
    [updateScanResults]
  );

  const renderSettings = useMemo(
    () => (
      <ScrollView 
        className={`native:px-2 flex-1`}
        showsVerticalScrollIndicator={false}
      >
        <View className="native:space-y-2 tablet:space-y-4">
          {renderHeader}

          <SettingsSection 
            title="高级设置" 
            collapsible 
            className="native:py-2 tablet:py-4"
          >
            <AdvancedSettings />
          </SettingsSection>

          <ScanButton
            isScanning={isScanning}
            onPress={startScan}
            progress={scanProgress}
          />
        </View>
      </ScrollView>
    ),
    [renderHeader, isScanning, startScan, scanProgress]
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
      <View className="w-[60%] flex-1">
        <DraggableFlatList
          key={layout}
          data={filteredResults}
          numColumns={2}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          onDragEnd={onDragEnd}
          className="p-4"
          ListEmptyComponent={renderEmptyComponent}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={5}
          getItemLayout={getItemLayout}
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
          }}
          columnWrapperStyle={{ justifyContent: "space-between" }}
        />
      </View>
    ),
    [
      layout,
      filteredResults,
      renderItem,
      onDragEnd,
      keyExtractor,
      renderEmptyComponent,
      getItemLayout,
    ]
  );

  const { height: windowHeight } = useWindowDimensions();

  const contentHeight = useMemo(() => {
    const headerHeight = 56; // 估计的header高度
    const historyHeight = scanHistory.length > 0 ? 140 : 0;
    return windowHeight - headerHeight - historyHeight;
  }, [windowHeight, scanHistory.length]);

  // 优化历史记录渲染
  const memoizedHistory = useMemo(() => {
    return scanHistory.length > 0 ? (
      <Animated.View entering={FadeIn.duration(500)} className="mb-2">
        <Label className="text-lg font-bold px-4 mb-1">最近扫描</Label>
        <ScanHistory
          history={scanHistory}
          onSelectHistory={handleHistorySelect}
        />
      </Animated.View>
    ) : null;
  }, [scanHistory, handleHistorySelect]);

  return (
    <GestureHandlerRootView className="flex-1 bg-background">
      <View className="flex-1 flex-row">
        <View className="w-[40%] border-r border-border">
          {renderSettings}
        </View>

        <View className="w-[60%] flex-1">
          {memoizedHistory}
          <View className="flex-1 px-2">
            <DraggableFlatList
              key={layout}
              data={filteredResults}
              numColumns={layout === 'grid' ? 2 : 1}
              keyExtractor={keyExtractor}
              renderItem={renderItem}
              onDragEnd={onDragEnd}
              ListEmptyComponent={renderEmptyComponent}
              removeClippedSubviews={true}
              maxToRenderPerBatch={10}
              windowSize={5}
              getItemLayout={getItemLayout}
              maintainVisibleContentPosition={{
                minIndexForVisible: 0,
              }}
              columnWrapperStyle={layout === 'grid' ? { justifyContent: 'space-between' } : undefined}
            />
          </View>
        </View>
      </View>
    </GestureHandlerRootView>
  );
};

export default React.memo(ScannerPage);
