import React, { useState } from "react";
import { View, Pressable, useWindowDimensions } from "react-native";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronUp, Info } from "lucide-react-native";
import Animated, {
  withTiming,
  useAnimatedStyle,
  withSpring,
  FadeIn,
  FadeOut,
  Layout,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  collapsible?: boolean;
  description?: string;
  isError?: boolean;
}

const SettingsSection: React.FC<SettingsSectionProps> = ({
  title,
  children,
  className = "",
  collapsible = false,
  description,
  isError = false,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { width } = useWindowDimensions();
  const isLandscape = width > 768;

  const contentStyle = useAnimatedStyle(() => ({
    height: withSpring(isCollapsed ? 0 : "auto", {
      damping: 15,
      stiffness: 100,
      mass: 0.5,
    }),
    opacity: withTiming(isCollapsed ? 0 : 1, {
      duration: 200,
    }),
    transform: [
      {
        scale: withSpring(isCollapsed ? 0.95 : 1, {
          damping: 15,
          stiffness: 100,
        }),
      },
    ],
  }));

  const handlePress = () => {
    if (collapsible) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setIsCollapsed(!isCollapsed);
    }
  };

  return (
    <Animated.View
      entering={FadeIn.duration(300).springify()}
      exiting={FadeOut.duration(200)}
      layout={Layout.springify()}
      className={`rounded-lg p-4 ${
        isLandscape ? "mx-2" : "mb-4"
      } ${className} ${
        isError ? "border border-red-500" : "bg-white dark:text-white dark:bg-gray-950"
      }`}
      style={{
        flex: isLandscape ? 1 : undefined,
      }}
    >
      <Pressable
        className="flex-row justify-between items-center"
        onPress={handlePress}
      >
        <View className="flex-1">
          <View className="flex-row items-center space-x-2">
            <Label className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {title}
            </Label>
            {isError && <Info size={16} className="text-red-500" />}
          </View>
          {description && (
            <Label className="text-sm text-gray-500 mt-1">{description}</Label>
          )}
        </View>
        {collapsible && (isCollapsed ? <ChevronDown /> : <ChevronUp />)}
      </Pressable>

      <Animated.View
        style={collapsible ? contentStyle : undefined}
        className={collapsible ? "overflow-hidden" : ""}
      >
        {children}
      </Animated.View>
    </Animated.View>
  );
};

export default SettingsSection;
