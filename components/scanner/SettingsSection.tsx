import React from "react";
import { View, Text } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
}

const SettingsSection: React.FC<SettingsSectionProps> = ({
  title,
  children,
}) => {
  return (
    <Animated.View entering={FadeIn.duration(500)} className="mb-4">
      <Text className="text-xl font-semibold mb-2 text-gray-800 dark:text-gray-200">
        {title}
      </Text>
      {children}
    </Animated.View>
  );
};

export default SettingsSection;
