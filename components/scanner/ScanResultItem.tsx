import React from "react";
import { View, Text } from "react-native";
import Animated, { FadeInLeft } from "react-native-reanimated";

interface ScanResult {
  port: number;
  status: string;
  service?: string;
}

interface ScanResultItemProps {
  item: ScanResult;
}

const ScanResultItem: React.FC<ScanResultItemProps> = ({ item }) => {
  return (
    <Animated.View
      entering={FadeInLeft.delay(100).duration(500)}
      className="border-b border-gray-200 dark:border-gray-700 py-2"
    >
      <Text className="text-md text-gray-700 dark:text-gray-300">
        端口: {item.port}
      </Text>
      <Text
        className={`text-md ${
          item.status === "open" ? "text-green-500" : "text-red-500"
        } dark:text-${item.status === "open" ? "green-400" : "red-400"}`}
      >
        状态: {item.status === "open" ? "开放" : "关闭"}
      </Text>
      {item.service && (
        <Text className="text-md text-gray-700 dark:text-gray-300">
          服务: {item.service}
        </Text>
      )}
    </Animated.View>
  );
};

export default ScanResultItem;
