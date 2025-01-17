import React from "react";
import { Pressable } from "react-native";
import { Sun, Moon } from "lucide-react-native";
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import useScannerStore from "@/stores/useScannerStore";

const ThemeToggle: React.FC = () => {
  const { isDarkTheme, setIsDarkTheme } = useScannerStore();

  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: withSpring(isDarkTheme ? "180deg" : "0deg") },
      { scale: withTiming(1, { duration: 200 }) },
    ],
  }));

  return (
    <Pressable
      onPress={() => setIsDarkTheme(!isDarkTheme)}
      className="absolute top-4 right-4 z-10"
    >
      <Animated.View style={iconStyle}>
        {isDarkTheme ? (
          <Moon size={24} className="text-white" />
        ) : (
          <Sun size={24} className="text-gray-800" />
        )}
      </Animated.View>
    </Pressable>
  );
};

export default React.memo(ThemeToggle);
