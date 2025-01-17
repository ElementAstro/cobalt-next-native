import React, { useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import {
  XCircle,
  Wifi,
  Gauge,
  Signal,
  RefreshCw,
  History,
  TrendingUp,
  Database,
} from "lucide-react-native";
import Animated, {
  useAnimatedStyle,
  withTiming,
  useSharedValue,
  Easing,
} from "react-native-reanimated";
import { useNetworkStore } from "@/stores/useNetworkStore";
import { useColorScheme } from "@/hooks/useColorScheme";
import RNEChartsPro from "react-native-echarts-pro";
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogHeader,
} from "@/components/ui/dialog";

interface NetworkInfoModalProps {
  visible: boolean;
  onClose: () => void;
}

export const NetworkInfoModal: React.FC<NetworkInfoModalProps> = ({
  visible,
  onClose,
}) => {
  const {
    ipAddress,
    networkState,
    isAirplaneMode,
    networkSpeed,
    isTestingSpeed,
    networkHistory,
    fetchNetworkInfo,
    testNetworkSpeed,
  } = useNetworkStore();
  const colorScheme = useColorScheme();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const fadeAnim = useSharedValue(0);
  const slideAnim = useSharedValue(-300);

  useEffect(() => {
    if (visible) {
      fadeAnim.value = withTiming(1, { duration: 300 });
      slideAnim.value = withTiming(0, {
        duration: 300,
        easing: Easing.out(Easing.exp),
      });

      fetchNetworkInfo();
    } else {
      fadeAnim.value = withTiming(0, { duration: 300 });
      slideAnim.value = withTiming(-300, {
        duration: 300,
        easing: Easing.in(Easing.exp),
      });
    }
  }, [fadeAnim, fetchNetworkInfo, slideAnim, visible]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
  }));

  const modalStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: slideAnim.value }],
  }));

  const chartOptions = {
    tooltip: {
      trigger: "axis",
    },
    legend: {
      data: ["下载速度 (Mbps)", "上传速度 (Mbps)"],
      textStyle: { color: colorScheme === "dark" ? "#fff" : "#000" },
    },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: networkHistory.map((item) =>
        new Date(item.timestamp).toLocaleTimeString()
      ),
      axisLine: {
        lineStyle: {
          color: colorScheme === "dark" ? "#fff" : "#000",
        },
      },
      axisLabel: {
        color: colorScheme === "dark" ? "#fff" : "#000",
      },
    },
    yAxis: {
      type: "value",
      axisLine: {
        lineStyle: {
          color: colorScheme === "dark" ? "#fff" : "#000",
        },
      },
      axisLabel: {
        color: colorScheme === "dark" ? "#fff" : "#000",
      },
    },
    series: [
      {
        name: "下载速度 (Mbps)",
        type: "line",
        data: networkHistory.map((item) => item.download),
        smooth: true,
        lineStyle: {
          color: "#3b82f6",
        },
        itemStyle: {
          color: "#3b82f6",
        },
      },
      {
        name: "上传速度 (Mbps)",
        type: "line",
        data: networkHistory.map((item) => item.upload),
        smooth: true,
        lineStyle: {
          color: "#10b981",
        },
        itemStyle: {
          color: "#10b981",
        },
      },
    ],
  };

  return (
    <Dialog open={visible} onOpenChange={onClose}>
      <DialogContent
        className={`w-11/12 max-w-2xl bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg flex ${
          isLandscape ? "flex-row space-x-4" : "flex-col"
        }`}
        style={modalStyle}
      >
        {/* Content */}
        <ScrollView
          className={`${isLandscape ? "flex-1" : "w-full"} space-y-4`}
          contentContainerStyle={{ flexGrow: 1 }}
        >
          {/* IP Address */}
          <View className="flex-row items-center space-x-2">
            <Wifi size={20} color="#3b82f6" />
            <Text
              className={`text-base ${
                colorScheme === "dark" ? "text-white" : "text-black"
              }`}
            >
              IP 地址: {ipAddress || "加载中..."}
            </Text>
          </View>

          {/* Network Status */}
          <View className="flex-row items-center space-x-2">
            <Signal size={20} color="#3b82f6" />
            <Text
              className={`text-base ${
                colorScheme === "dark" ? "text-white" : "text-black"
              }`}
            >
              网络状态: {networkState ? networkState.type : "加载中..."}
            </Text>
          </View>

          {/* Airplane Mode */}
          <View className="flex-row items-center space-x-2">
            <Gauge size={20} color="#3b82f6" />
            <Text
              className={`text-base ${
                colorScheme === "dark" ? "text-white" : "text-black"
              }`}
            >
              飞行模式: {isAirplaneMode ? "是" : "否"}
            </Text>
          </View>

          {/* Network Speed */}
          {networkSpeed && (
            <View>
              <Text
                className={`text-xl font-medium mb-2 ${
                  colorScheme === "dark" ? "text-white" : "text-black"
                }`}
              >
                网络速度
              </Text>
              <View className="flex-row justify-between">
                <View className="flex-1 bg-gray-200 dark:bg-gray-700 p-4 rounded-lg mr-2">
                  <Text className="text-sm text-gray-600 dark:text-gray-300">
                    下载
                  </Text>
                  <Text className="text-lg font-semibold text-blue-500">
                    {networkSpeed.download} Mbps
                  </Text>
                </View>
                <View className="flex-1 bg-gray-200 dark:bg-gray-700 p-4 rounded-lg mx-2">
                  <Text className="text-sm text-gray-600 dark:text-gray-300">
                    上传
                  </Text>
                  <Text className="text-lg font-semibold text-green-500">
                    {networkSpeed.upload} Mbps
                  </Text>
                </View>
                <View className="flex-1 bg-gray-200 dark:bg-gray-700 p-4 rounded-lg ml-2">
                  <Text className="text-sm text-gray-600 dark:text-gray-300">
                    质量
                  </Text>
                  <Text className="text-lg font-semibold text-yellow-500">
                    {networkSpeed.quality}%
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Network History Chart */}
          {networkHistory.length > 0 && (
            <View>
              <Text
                className={`text-xl font-medium mb-2 ${
                  colorScheme === "dark" ? "text-white" : "text-black"
                }`}
              >
                网络历史
              </Text>
              <View className="h-64">
                <RNEChartsPro
                  height={250}
                  option={chartOptions}
                  backgroundColor="transparent"
                  themeName={colorScheme === "dark" ? "dark" : "shine"}
                />
              </View>
            </View>
          )}

          {/* Buttons */}
          <TouchableOpacity
            className={`mt-6 py-3 rounded-lg flex-row justify-center items-center ${
              colorScheme === "dark"
                ? "bg-blue-600"
                : "bg-blue-500 hover:bg-blue-600"
            } disabled:opacity-50`}
            onPress={testNetworkSpeed}
            disabled={isTestingSpeed}
          >
            {isTestingSpeed ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <RefreshCw size={16} color="#fff" className="mr-2" />
                <Text className="text-white font-medium">测试网络速度</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            className={`mt-4 py-3 rounded-lg flex-row justify-center items-center ${
              colorScheme === "dark"
                ? "bg-gray-600"
                : "bg-gray-300 hover:bg-gray-400"
            }`}
            onPress={fetchNetworkInfo}
          >
            <History
              size={16}
              color={colorScheme === "dark" ? "#fff" : "#000"}
              className="mr-2"
            />
            <Text
              className={`font-medium ${
                colorScheme === "dark" ? "text-white" : "text-black"
              }`}
            >
              刷新网络信息
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Additional Icons for Enhanced Visuals */}
        <View
          className={`absolute ${
            isLandscape ? "left-4 top-4" : "right-4 top-4"
          } flex flex-col items-center space-y-2 ${
            isLandscape ? "mt-0" : "mt-4"
          }`}
        >
          <TrendingUp size={24} color="#10b981" />
          <Database size={24} color="#f59e0b" />
        </View>
      </DialogContent>
    </Dialog>
  );
};
