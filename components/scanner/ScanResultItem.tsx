import React, { memo } from "react";
import { View, Pressable, useWindowDimensions } from "react-native";
import Animated, {
  FadeInLeft,
  Layout,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence
} from "react-native-reanimated";
import { Label } from "@/components/ui/label";
import * as Haptics from "expo-haptics";
import { CheckCircle, AlertCircle, Info } from "lucide-react-native";

interface ScanResult {
  port: number;
  status: string;
  service?: string;
  details?: string;
  isSelected?: boolean;
}

interface ScanResultItemProps {
  item: ScanResult;
  index: number;
  onPress?: () => void;
}

const ScanResultItem: React.FC<ScanResultItemProps> = memo(
  ({ item, index, onPress }) => {
    const { width } = useWindowDimensions();
    const isLandscape = width > 768;

    const fadeInStyle = useAnimatedStyle(() => ({
      opacity: withSpring(1, { mass: 0.5, damping: 10 }),
      transform: [
        {
          translateY: withSpring(0, { mass: 0.5, damping: 10 }),
        },
      ],
    }));

    const shakeStyle = useAnimatedStyle(() => ({
      transform: [
        {
          translateX: withSequence(
            withTiming(-5, { duration: 50 }),
            withTiming(5, { duration: 50 }),
            withTiming(-5, { duration: 50 }),
            withTiming(5, { duration: 50 }),
            withTiming(0, { duration: 50 })
          )
        }
      ]
    }));

    const handlePress = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress?.();
    };

    return (
      <Animated.View
        entering={FadeInLeft.delay(index * 50)
          .duration(400)
          .springify()}
        layout={Layout.springify()}
        style={[fadeInStyle, item.status === "error" ? shakeStyle : undefined]}
        className={`${
          isLandscape ? "mx-1 w-[48.5%]" : "w-full"
        } overflow-hidden`}
      >
        <Pressable
          onPress={handlePress}
          className={`flex-row items-center justify-between p-3 mb-2 rounded-lg border ${
            item.isSelected 
              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
              : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
          }`}
        >
          <View className="flex-1">
            <View className="flex-row items-center space-x-2 mb-1">
              <Label className="text-base font-medium">
                端口 {item.port}
                {item.service && ` - ${item.service}`}
              </Label>
              {item.details && (
                <Info size={14} className="text-gray-400" />
              )}
            </View>

            <View className="flex-row items-center space-x-2">
              <View
                className={`w-3 h-3 rounded-full ${
                  item.status === "open" 
                    ? "bg-green-500" 
                    : item.status === "error"
                    ? "bg-red-500"
                    : "bg-gray-500"
                }`}
              />
              <Label
                className={`${
                  item.status === "open"
                    ? "text-green-600 dark:text-green-400"
                    : item.status === "error"
                    ? "text-red-600 dark:text-red-400"
                    : "text-gray-600 dark:text-gray-400"
                } text-sm`}
              >
                {item.status === "open" 
                  ? "开放" 
                  : item.status === "error"
                  ? "错误"
                  : "关闭"}
              </Label>
            </View>
          </View>

          {item.status === "error" ? (
            <AlertCircle size={20} className="text-red-500" />
          ) : item.status === "open" ? (
            <CheckCircle size={20} className="text-green-500" />
          ) : null}
        </Pressable>
      </Animated.View>
    );
  }
);

ScanResultItem.displayName = "ScanResultItem";

export default ScanResultItem;
