import React, { useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  ActivityIndicator,
} from "react-native";
import { Wifi, Gauge, Signal, RefreshCw, History } from "lucide-react-native";
import {
  useAnimatedStyle,
  withTiming,
  useSharedValue,
  Easing,
} from "react-native-reanimated";
import { useNetworkStore } from "@/stores/useNetworkStore";
import { useColorScheme } from "@/hooks/useColorScheme";
import RNEChartsPro from "react-native-echarts-pro";
import { Dialog, DialogContent } from "@/components/ui/dialog";

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
  }, [visible, fadeAnim, slideAnim, fetchNetworkInfo]);

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
        className={`w-full max-w-3xl bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg flex ${
          isLandscape ? "flex-row space-x-4" : "flex-col"
        }`}
        style={modalStyle}
      >
        {/* 左侧：网络信息 */}
        <View className={`flex-1 space-y-4`}>
          {/* IP 地址 */}
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

          {/* 网络状态 */}
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

          {/* 飞行模式 */}
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

          {/* 网络速度 */}
          {networkSpeed && (
            <View className="space-y-2">
              <Text
                className={`text-xl font-medium ${
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

          {/* 操作按钮 */}
          <View className="space-y-2">
            <TouchableOpacity
              className={`py-3 rounded-lg flex-row justify-center items-center bg-blue-500 dark:bg-blue-600 transform active:scale-95 disabled:opacity-50`}
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
              className={`py-3 rounded-lg flex-row justify-center items-center bg-gray-300 dark:bg-gray-600 transform active:scale-95`}
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
          </View>
        </View>

        {/* 右侧：网络历史图表（横屏时显示） */}
        {isLandscape && networkHistory.length > 0 && (
          <View className="flex-1 space-y-4">
            <Text
              className={`text-xl font-medium ${
                colorScheme === "dark" ? "text-white" : "text-black"
              }`}
            >
              网络历史
            </Text>
            <View className="h-48">
              <RNEChartsPro
                height={200}
                option={chartOptions}
                backgroundColor="transparent"
                themeName={colorScheme === "dark" ? "dark" : "shine"}
              />
            </View>
          </View>
        )}
      </DialogContent>
    </Dialog>
  );
};
