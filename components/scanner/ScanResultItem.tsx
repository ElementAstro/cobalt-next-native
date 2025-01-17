import React, { memo } from "react";
import { View, Pressable, useWindowDimensions } from "react-native";
import Animated, {
  FadeInLeft,
  Layout,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { Label } from "@/components/ui/label";
import * as Haptics from "expo-haptics";

interface ScanResult {
  port: number;
  status: string;
  service?: string;
}

interface ScanResultItemProps {
  item: ScanResult;
  index: number;
}

const ScanResultItem: React.FC<ScanResultItemProps> = memo(
  ({ item, index }) => {
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

    const handlePress = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    return (
      <Animated.View
        entering={FadeInLeft.delay(index * 50)
          .duration(400)
          .springify()}
        layout={Layout.springify()}
        style={[fadeInStyle]}
        className={`${
          isLandscape ? "mx-1 w-[48.5%]" : "w-full"
        } overflow-hidden`}
      >
        <Pressable
          onPress={handlePress}
          className="flex-row items-center justify-between p-3 mb-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
        >
          <View className="flex-1">
            <Label className="text-base font-medium mb-1">
              端口 {item.port}
              {item.service && ` - ${item.service}`}
            </Label>

            <Label
              className={`${
                item.status === "open"
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              } text-sm`}
            >
              {item.status === "open" ? "开放" : "关闭"}
            </Label>
          </View>

          <View
            className={`w-3 h-3 rounded-full ${
              item.status === "open" ? "bg-green-500" : "bg-red-500"
            }`}
          />
        </Pressable>
      </Animated.View>
    );
  }
);

ScanResultItem.displayName = "ScanResultItem";

export default ScanResultItem;
