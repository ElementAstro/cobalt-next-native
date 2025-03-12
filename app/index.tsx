import React, {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { View, Text, SafeAreaView, ScrollView, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { BlurView } from "expo-blur";
import {
  CopilotProvider,
  useCopilot,
  walkthroughable,
} from "react-native-copilot";
import { toast } from "sonner-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
  FadeIn,
} from "react-native-reanimated";
import BottomSheet, { BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Button } from "~/components/ui/button";
import UpdateDialog from "~/components/home/update-dialog";
import { CustomWebView } from "~/components/home/webview";
import { ModeSelectionCards } from "~/components/home/mode-selection-cards";
import { StatusCard } from "~/components/home/status-card";
import FileSystem from "~/components/image/file-system";
import SettingsPage from "~/components/setting/settings-page";
import { useColorScheme } from "~/lib/useColorScheme";
import { useNetworkStore } from "~/stores/useNetworkStore";
import { useHomeStore } from "~/stores/useHomeStore";
import useScannerStore, { type ScanStatus } from "~/stores/useScannerStore";
import ScanButton from "~/components/scan/scan-button";
import ScanHistory from "~/components/scan/scan-history";
import AdvancedSettings from "~/components/scan/advanced-settings";

const WalkthroughButton = walkthroughable(ScanButton);

function HomeScreenContent() {
  const { start } = useCopilot();
  const [activeMode, setActiveMode] = useState<"hotspot" | "lan">("hotspot");
  const [isConnected, setIsConnected] = useState(false);
  const [showWebView, setShowWebView] = useState(false);
  const [webViewUrl, setWebViewUrl] = useState("");
  const { ipAddress, port, setIpAddress, setPort } = useHomeStore();
  const { setModalVisible } = useNetworkStore();
  const {
    isScanning,
    scanProgress,
    scanStatus,
    scanHistory,
    startScan,
    stopScan,
    setScanProgress,
    setScanStatus,
  } = useScannerStore();

  // 新增变量定义
  const bottomSheetRef = useRef<BottomSheet>(null);
  const colorScheme = useColorScheme();
  const buttonOpacity = useSharedValue(1);
  const scanAnimation = useSharedValue(0);

  // Sheet 状态变化处理
  const handleSheetChanges = useCallback((index: number) => {
    if (index === -1) {
      setSelectedSheet(null);
    }
  }, []);

  // 新增 renderBackdrop 函数
  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
      />
    ),
    []
  );

  // 扫描动画 & 连接动画
  const connectionScale = useSharedValue(1);

  // 扫描动画逻辑
  useEffect(() => {
    if (isScanning) {
      scanAnimation.value = withTiming(1, {
        duration: 1500,
        easing: Easing.linear,
      });
    } else {
      scanAnimation.value = withTiming(0, { duration: 500 });
    }
  }, [isScanning, scanAnimation]);

  // 连接状态动画
  useEffect(() => {
    connectionScale.value = withSequence(
      withTiming(1.1, { duration: 200 }),
      withTiming(1, { duration: 200 })
    );
  }, [connectionScale, isConnected]);

  useEffect(() => {
    start();
  }, [start]);

  const handleScan = async () => {
    if (isScanning) {
      stopScan();
      return;
    }

    startScan();
    setScanProgress(0);
    setScanStatus("scanning");

    try {
      // 模拟扫描进度
      let progress = 0;
      const interval = setInterval(() => {
        progress += 0.1;
        if (progress >= 1) {
          clearInterval(interval);
          setScanProgress(1);
          return;
        }
        setScanProgress(progress);
      }, 1000);

      await new Promise((resolve) => setTimeout(resolve, 2000));
      stopScan();
      setIsConnected(true);
      setScanStatus("success");
      
      const protocol = "http";
      const url = `${protocol}://${ipAddress}:${port}`;
      setWebViewUrl(url);
      setShowWebView(true);
      toast.success("连接成功");
    } catch (error) {
      stopScan();
      setScanStatus("error");
      toast.error("扫描失败", {
        description: error instanceof Error ? error.message : "未知错误",
      });
    }
  };

  const handleWebViewError = useCallback((_: any) => {
    setShowWebView(false);
    setIsConnected(false);
    toast.error("连接失败", {
      description: "请确保设备在同一网络下",
    });
  }, []);

  const handleIpChange = (value: string) => {
    setIpAddress(value);
  };

  const handlePortChange = (value: string) => {
    setPort(value);
  };

  // Sheet的展开比例
  const snapPoints = useMemo(() => ["25%", "50%", "95%"], []);
  const [selectedSheet, setSelectedSheet] = useState<"settings" | "files" | "history" | null>(
    null
  );

  if (showWebView) {
    return (
      <CustomWebView
        url={webViewUrl}
        onError={handleWebViewError}
        customParams={{ mode: activeMode, timestamp: Date.now().toString() }}
      />
    );
  }

  return (
    <SafeAreaView className="flex-1">
      <BlurView intensity={25} tint="dark" className="flex-1">
        {/* 添加设置按钮 */}
        <View className="absolute right-4 top-8 z-10 flex-row space-x-2">
          <Animated.View entering={FadeIn.duration(500).springify()}>
            <Button
              variant="ghost"
              size="icon"
              className="w-12 h-12 rounded-full bg-primary/10 backdrop-blur-md border border-primary/20"
              onPress={() => {
                if (Platform.OS !== "web") {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                setSelectedSheet("history");
                bottomSheetRef.current?.snapToIndex(2);
              }}
            >
              <MaterialCommunityIcons
                name="history"
                size={26}
                className="text-primary"
              />
            </Button>
          </Animated.View>
          
          <Animated.View entering={FadeIn.duration(500).springify()}>
            <Button
              variant="ghost"
              size="icon"
              className="w-12 h-12 rounded-full bg-primary/10 backdrop-blur-md border border-primary/20"
              onPress={() => {
                if (Platform.OS !== "web") {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                setSelectedSheet("files");
                bottomSheetRef.current?.snapToIndex(2);
              }}
            >
              <MaterialCommunityIcons
                name="folder"
                size={26}
                className="text-primary"
              />
            </Button>
          </Animated.View>
          
          <Animated.View entering={FadeIn.duration(500).springify()}>
            <Button
              variant="ghost"
              size="icon"
              className="w-12 h-12 rounded-full bg-primary/10 backdrop-blur-md border border-primary/20"
              onPress={() => {
                if (Platform.OS !== "web") {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                setSelectedSheet("settings");
                bottomSheetRef.current?.snapToIndex(2);
              }}
            >
              <MaterialCommunityIcons
                name="cog"
                size={26}
                className="text-primary animate-spin-slow"
              />
            </Button>
          </Animated.View>
        </View>
        <ScrollView
          className="flex-1 px-4 pt-16"
          contentContainerStyle={{ paddingBottom: 120 }}
        >
          <View className="space-y-4">
            <ModeSelectionCards
              activeMode={activeMode}
              setActiveMode={(mode) => {
                setActiveMode(mode);
                setIsConnected(false);
              }}
            />
            <StatusCard
              isConnected={isConnected}
              activeMode={activeMode}
              ipAddress={ipAddress}
              port={port}
              handleIpChange={handleIpChange}
              handlePortChange={handlePortChange}
              onPress={() => setModalVisible(true)}
            />
            <Animated.View style={[{ opacity: buttonOpacity }]}>
              <WalkthroughButton
                isScanning={isScanning}
                onPress={handleScan}
                progress={scanProgress}
                status={scanStatus}
              />
            </Animated.View>
            <View className="mt-4">
              <UpdateDialog />
            </View>
          </View>
        </ScrollView>
        <BottomSheet
          ref={bottomSheetRef}
          snapPoints={snapPoints}
          index={-1}
          enablePanDownToClose
          backdropComponent={renderBackdrop}
          onChange={handleSheetChanges}
          handleIndicatorStyle={{
            backgroundColor:
              colorScheme.colorScheme === "dark" ? "#ffffff50" : "#00000050",
            width: 40,
          }}
          backgroundStyle={{
            backgroundColor:
              colorScheme.colorScheme === "dark" ? "#1f2937" : "#ffffff",
          }}
          enableContentPanningGesture={true}
          enableHandlePanningGesture={true}
          animateOnMount={true}
          style={{
            shadowColor: "#000",
            shadowOffset: {
              width: 0,
              height: -4,
            },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 5,
          }}
        >
          <View className="flex-1 bg-background">
            {selectedSheet === "settings" && <SettingsPage />}
            {selectedSheet === "files" && (
              <View className="flex-1">
                <FileSystem />
              </View>
            )}
            {selectedSheet === "history" && (
              <View className="flex-1 p-4">
                <Text className="text-xl font-bold mb-4">扫描历史</Text>
                <ScanHistory
                  history={scanHistory}
                  onSelectHistory={(item) => {
                    bottomSheetRef.current?.close();
                    toast.info(`选择了扫描记录: ${item.ipAddress}`);
                  }}
                />
              </View>
            )}
          </View>
        </BottomSheet>
      </BlurView>
    </SafeAreaView>
  );
}

export default function HomeScreen() {
  return (
    <CopilotProvider
      tooltipStyle={{
        backgroundColor: "#1F2937",
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 8,
      }}
      backdropColor="rgba(0,0,0,0.8)"
      labels={{
        previous: "上一步",
        next: "下一步",
        skip: "跳过",
        finish: "完成",
      }}
    >
      <HomeScreenContent />
    </CopilotProvider>
  );
}
