import React from "react";
import { TouchableOpacity, Text } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

const AnimatedTouchableOpacity =
  Animated.createAnimatedComponent(TouchableOpacity);

interface ScanButtonProps {
  isScanning: boolean;
  onPress: () => void;
}

const ScanButton: React.FC<ScanButtonProps> = ({ isScanning, onPress }) => {
  return (
    <AnimatedTouchableOpacity
      entering={FadeIn.duration(500)}
      className={`p-4 rounded-lg items-center ${
        isScanning ? "bg-gray-400" : "bg-blue-500"
      }`}
      onPress={onPress}
      disabled={isScanning}
    >
      <Text className="text-white text-lg font-bold">
        {isScanning ? "扫描中..." : "开始扫描"}
      </Text>
    </AnimatedTouchableOpacity>
  );
};

export default ScanButton;
