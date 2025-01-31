import React, { useMemo, useCallback } from "react";
import { useWindowDimensions, ScrollView } from "react-native";
import { z } from "zod";
import { toast } from "sonner-native";
import {
  Settings,
  Languages,
  Shapes,
  Volume,
  Moon,
  Sun,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  LucideIcon,
} from "lucide-react-native";
import Animated, { FadeInDown, SlideInRight } from "react-native-reanimated";
import { useGeneralSettings } from "@/hooks/useGeneralSettings";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

// 类型定义
interface GeneralSettings {
  autoLanguage: boolean;
  vibration: boolean;
  sound: boolean;
  darkMode: boolean;
}

interface SettingItemProps {
  icon: LucideIcon;
  label: string;
  value: boolean;
  onToggle: (checked: boolean) => void;
}

// Zod Schema
const GeneralSettingsSchema = z
  .object({
    autoLanguage: z.boolean(),
    vibration: z.boolean(),
    sound: z.boolean(),
    darkMode: z.boolean(),
  })
  .refine((data) => {
    if (data.sound && !data.vibration) {
      throw new Error("启用声音时需要同时启用振动");
    }
    return true;
  });

const SettingItem = ({
  icon: Icon,
  label,
  value,
  onToggle,
}: SettingItemProps) => (
  <Animated.View
    entering={SlideInRight}
    className="flex-row justify-between items-center py-3 border-b border-border"
  >
    <Label className="flex-row items-center space-x-2">
      <Icon size={18} className="text-foreground" />
      <Text>{label}</Text>
    </Label>
    <Switch checked={value} onCheckedChange={onToggle} />
  </Animated.View>
);

const GeneralSetting = () => {
  const { settings, updateSetting } = useGeneralSettings();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const settingsItems = useMemo(
    () => [
      {
        label: "自动语言",
        value: settings.autoLanguage,
        icon: Languages,
        settingKey: "autoLanguage",
      },
      {
        label: "震动反馈",
        value: settings.vibration,
        icon: Shapes,
        settingKey: "vibration",
        description: "开启以获得更好的触觉反馈",
      },
      {
        label: "声音效果",
        value: settings.sound,
        icon: Volume,
        settingKey: "sound",
        description: "操作时播放提示音",
      },
      {
        label: "夜间模式",
        value: settings.darkMode,
        icon: settings.darkMode ? Moon : Sun,
        settingKey: "darkMode",
        description: "切换深色/浅色主题",
      },
    ],
    [settings]
  );

  const handleSettingChange = useCallback(
    async (key: keyof GeneralSettings, value: boolean) => {
      try {
        const updatedSettings = { ...settings, [key]: value };
        GeneralSettingsSchema.parse(updatedSettings);

        updateSetting(key as keyof GeneralSettings, value);
        toast.success("设置已更新", {
          description: `${String(key)} 已${value ? "启用" : "禁用"}`,
          icon: <CheckCircle2 size={20} />,
        });
      } catch (error) {
        toast.error("设置失败", {
          description: error instanceof Error ? error.message : "未知错误",
          icon: <AlertCircle size={20} />,
        });
      }
    },
    [settings, updateSetting]
  );

  return (
    <Animated.View 
      entering={FadeInDown.duration(500)} 
      className="flex-1 p-2 md:p-4"
    >
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
      >
        <Card className="w-full sm:w-[95%] md:w-[90%] mx-auto">
          <CardHeader>
            <CardTitle className="flex-row items-center space-x-2">
              <Settings size={24} className="text-primary" />
              <Text className="text-xl font-bold">常规设置</Text>
            </CardTitle>
            <CardDescription>管理应用的基本设置选项</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {settingsItems.map((item) => (
              <SettingItem
                key={item.settingKey}
                icon={item.icon}
                label={item.label}
                value={item.value}
                onToggle={(checked: boolean) =>
                  handleSettingChange(
                    item.settingKey as keyof GeneralSettings,
                    checked
                  )
                }
              />
            ))}

            <Alert variant="default" icon={RefreshCw}>
              <AlertTitle>自动保存</AlertTitle>
              <AlertDescription>设置会自动保存，无需手动操作</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </ScrollView>
    </Animated.View>
  );
};

export default GeneralSetting;
