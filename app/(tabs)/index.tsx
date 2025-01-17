import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import {
  CopilotProvider,
  CopilotStep,
  useCopilot,
  walkthroughable,
} from "react-native-copilot";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { NetworkInfoModal } from "@/components/connection/NetworkInfoModal";
import { useNetworkStore } from "@/stores/useNetworkStore";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  Easing,
  withSequence,
} from "react-native-reanimated";

const WalkthroughCard = walkthroughable(Card);
const WalkthroughButton = walkthroughable(Button);

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

function HomeScreenContent() {
  const { start } = useCopilot();
  const [activeMode, setActiveMode] = useState<"hotspot" | "lan">("hotspot");
  const [isConnected, setIsConnected] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [ipAddress] = useState("10.42.0.1");
  const { modalVisible, setModalVisible } = useNetworkStore();

  const scanAnimation = useSharedValue(0);
  const connectionScale = useSharedValue(1);

  useEffect(() => {
    start();
  }, [start]);

  useEffect(() => {
    if (isScanning) {
      scanAnimation.value = withRepeat(
        withTiming(1, {
          duration: 1500,
          easing: Easing.linear,
        }),
        -1,
        true
      );
    } else {
      scanAnimation.value = withTiming(0, { duration: 500 });
    }
  }, [isScanning, scanAnimation]);

  useEffect(() => {
    connectionScale.value = withSequence(
      withTiming(1.1, { duration: 200 }),
      withTiming(1, { duration: 200 })
    );
  }, [connectionScale, isConnected]);

  const animatedScanStyle = useAnimatedStyle(() => {
    return {
      opacity: scanAnimation.value,
      transform: [
        {
          rotate: `${scanAnimation.value * 360}deg`,
        },
      ],
    };
  });

  const animatedConnectionStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: connectionScale.value }],
    };
  });

  const handleScan = async () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      setIsConnected(true);
    }, 2000);
  };

  const handleModeChange = (mode: "hotspot" | "lan") => {
    setActiveMode(mode);
    setIsConnected(false);
  };

  const isLandscape = SCREEN_WIDTH > SCREEN_HEIGHT;

  return (
    <SafeAreaView className="flex-1">
      <LinearGradient colors={["#1a1f25", "#2d3748"]} className="flex-1">
        <BlurView intensity={20} className="flex-1">
          <View
            className={`flex-1 p-6 ${
              isLandscape
                ? "flex-row justify-between"
                : "flex-col justify-between"
            } pb-15`}
          >
            {/* Mode Selection */}
            <View
              className={`space-y-4 ${isLandscape ? "flex-1 mr-3" : "mb-3"}`}
            >
              <CopilotStep
                text="选择热点模式可以快速建立设备间连接"
                order={1}
                name="hotspot-mode"
              >
                <TouchableOpacity
                  onPress={() => handleModeChange("hotspot")}
                  className="transform active:scale-95"
                >
                  <WalkthroughCard
                    className={`border-2 shadow-lg ${
                      activeMode === "hotspot"
                        ? "border-primary bg-primary/10"
                        : "border-gray-300 bg-white"
                    }`}
                  >
                    <CardHeader>
                      <View className="flex-row items-center space-x-2">
                        <MaterialCommunityIcons
                          name="wifi"
                          size={24}
                          color={
                            activeMode === "hotspot" ? "#60a5fa" : "#6b7280"
                          }
                        />
                        <CardTitle>会议热点模式</CardTitle>
                      </View>
                      <CardDescription>
                        • 手机WiFi搜索附近WIFI即可使用QUARCS电话{"\n"}•
                        请确保设备在自动连接状态并切换到QUARCS电话
                      </CardDescription>
                    </CardHeader>
                    <CardFooter>
                      <Text
                        className={`text-sm ${
                          activeMode === "hotspot"
                            ? "text-primary"
                            : "text-gray-500"
                        }`}
                      >
                        {activeMode === "hotspot" ? "当前模式" : "点击切换"}
                      </Text>
                    </CardFooter>
                  </WalkthroughCard>
                </TouchableOpacity>
              </CopilotStep>

              <CopilotStep
                text="局域网模式适用于已有网络环境"
                order={2}
                name="lan-mode"
              >
                <TouchableOpacity
                  onPress={() => handleModeChange("lan")}
                  className="transform active:scale-95"
                >
                  <WalkthroughCard
                    className={`border-2 shadow-lg ${
                      activeMode === "lan"
                        ? "border-primary bg-primary/10"
                        : "border-gray-300 bg-white"
                    }`}
                  >
                    <CardHeader>
                      <View className="flex-row items-center space-x-2">
                        <MaterialCommunityIcons
                          name="lan"
                          size={24}
                          color={activeMode === "lan" ? "#60a5fa" : "#6b7280"}
                        />
                        <CardTitle>局域网模式</CardTitle>
                      </View>
                      <CardDescription>
                        • 设置设备找附近手持设备WLAN即可使用QUARCS电话
                      </CardDescription>
                    </CardHeader>
                    <CardFooter>
                      <Text
                        className={`text-sm ${
                          activeMode === "lan"
                            ? "text-primary"
                            : "text-gray-500"
                        }`}
                      >
                        {activeMode === "lan" ? "当前模式" : "点击切换"}
                      </Text>
                    </CardFooter>
                  </WalkthroughCard>
                </TouchableOpacity>
              </CopilotStep>
            </View>

            {/* Status and Scan */}
            <View className={`space-y-4 ${isLandscape ? "flex-1" : "w-full"}`}>
              <CopilotStep
                text="此处显示当前连接状态和IP地址"
                order={3}
                name="status"
              >
                <Animated.View style={animatedConnectionStyle}>
                  <TouchableOpacity onPress={() => setModalVisible(true)}>
                    <WalkthroughCard className="shadow-lg">
                      <CardHeader>
                        <View className="flex-row items-center space-x-2">
                          <MaterialCommunityIcons
                            name={
                              isConnected ? "lan-connect" : "lan-disconnect"
                            }
                            size={24}
                            color={isConnected ? "#22c55e" : "#ef4444"}
                          />
                          <CardTitle>状态</CardTitle>
                        </View>
                      </CardHeader>
                      <CardContent className="items-center space-y-3">
                        <Label className="text-xl font-semibold">
                          {isConnected ? "已连接" : "未连接设备"}
                        </Label>
                        <Label className="text-xl text-blue-500">
                          {ipAddress}
                        </Label>
                        <Text className="text-sm text-gray-400">
                          {activeMode === "hotspot" ? "热点模式" : "局域网模式"}
                        </Text>
                      </CardContent>
                    </WalkthroughCard>
                  </TouchableOpacity>
                </Animated.View>
              </CopilotStep>

              <CopilotStep
                text="点击扫描开始搜索附近设备"
                order={4}
                name="scan"
              >
                <WalkthroughButton
                  variant="default"
                  size="lg"
                  className="w-full shadow-lg"
                  onPress={handleScan}
                  disabled={isScanning}
                >
                  <View className="flex-row items-center justify-center space-x-2">
                    <Animated.View style={animatedScanStyle}>
                      <MaterialCommunityIcons
                        name="refresh"
                        size={20}
                        color="#fff"
                      />
                    </Animated.View>
                    <Text className="text-white font-semibold text-lg">
                      {isScanning ? "扫描中..." : "扫描"}
                    </Text>
                  </View>
                </WalkthroughButton>
              </CopilotStep>
            </View>
          </View>

          {/* Reserved Space for Bottom Tab Bar */}
          <View className="h-15" />

          <NetworkInfoModal
            visible={modalVisible}
            onClose={() => setModalVisible(false)}
          />
        </BlurView>
      </LinearGradient>
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
