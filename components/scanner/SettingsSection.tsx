import React, { useState } from "react";
import { View, Pressable, useWindowDimensions } from "react-native";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronUp } from "lucide-react-native";
import Animated, {
  withTiming,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";

interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  collapsible?: boolean;
}

const SettingsSection: React.FC<SettingsSectionProps> = ({
  title,
  children,
  className = "",
  collapsible = false,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { width } = useWindowDimensions();
  const isLandscape = width > 768;

  const contentStyle = useAnimatedStyle(() => ({
    height: withSpring(isCollapsed ? 0 : "auto", {
      damping: 15,
      stiffness: 100,
    }),
    opacity: withTiming(isCollapsed ? 0 : 1),
  }));

  return (
    <View
      className={`bg-white dark:bg-gray-800 rounded-lg p-4 ${
        isLandscape ? "mx-2 max-h-[80vh] overflow-y-auto" : "mb-4"
      } ${className}`}
      style={{
        flex: isLandscape ? 1 : undefined,
      }}
    >
      <Pressable
        className="flex-row justify-between items-center"
        onPress={() => collapsible && setIsCollapsed(!isCollapsed)}
      >
        <Label className="text-xl font-bold text-gray-900 dark:text-gray-100">
          {title}
        </Label>
        {collapsible && (isCollapsed ? <ChevronDown /> : <ChevronUp />)}
      </Pressable>

      <Animated.View style={collapsible ? contentStyle : undefined}>
        {children}
      </Animated.View>
    </View>
  );
};

export default SettingsSection;
