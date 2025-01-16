import React from "react";
import { View } from "react-native";
import { Label } from "@/components/ui/label";

interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

const SettingsSection: React.FC<SettingsSectionProps> = ({
  title,
  children,
  className = "",
}) => {
  return (
    <View
      className={`bg-white dark:bg-gray-800 rounded-lg p-4 mb-4 ${className}`}
    >
      <Label className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
        {title}
      </Label>
      {children}
    </View>
  );
};

export default SettingsSection;
