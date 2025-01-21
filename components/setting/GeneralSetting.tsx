import React, { useMemo } from "react";
import { View, useWindowDimensions, Text } from "react-native";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Settings,
  Globe,
  Phone,
  Volume2,
  Sun,
  Moon,
  Languages,
  Shapes,
  Volume,
  Save,
} from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import Toast from "react-native-toast-message";
import { useGeneralSettings } from "@/hooks/useGeneralSettings";

// Zod 数据验证
const GeneralSettingsSchema = z.object({
  autoLanguage: z.boolean(),
  vibration: z.boolean(),
  sound: z.boolean(),
  darkMode: z.boolean(),
});

type GeneralSettings = z.infer<typeof GeneralSettingsSchema>;

const GeneralSetting = () => {
  const { settings, updateSetting } = useGeneralSettings();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  // 使用 useMemo 优化设置项
  const settingsItems = useMemo(
    () => [
      {
        label: "自动语言",
        value: settings.autoLanguage,
        icon: <Languages size={16} />,
        settingKey: "autoLanguage",
      },
      {
        label: "震动反馈",
        value: settings.vibration,
        icon: <Shapes size={16} />,
        settingKey: "vibration",
      },
      {
        label: "声音效果",
        value: settings.sound,
        icon: <Volume size={16} />,
        settingKey: "sound",
      },
      {
        label: "夜间模式",
        value: settings.darkMode,
        icon: settings.darkMode ? <Moon size={16} /> : <Sun size={16} />,
        settingKey: "darkMode",
      },
    ],
    [settings]
  );

  const handleSettingChange = async (key: keyof GeneralSettings, value: boolean) => {
    try {
      // 验证数据
      const updatedSettings = { ...settings, [key]: value };
      GeneralSettingsSchema.parse(updatedSettings);

      updateSetting(key, value);
      Toast.show({
        type: "success",
        text1: "设置更新",
        text2: `${key} 已${value ? "启用" : "禁用"}`,
      });
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "设置失败",
        text2: error instanceof Error ? error.message : "未知错误",
      });
    }
  };

  const handleSaveSettings = async () => {
    try {
      // 验证所有设置
      GeneralSettingsSchema.parse(settings);
      
      Toast.show({
        type: "success",
        text1: "设置已保存",
        text2: "所有设置已成功保存",
      });
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "保存失败",
        text2: error instanceof Error ? error.message : "未知错误",
      });
    }
  };

  return (
    <Animated.View entering={FadeInDown} className="flex-1 p-4">
      <Card className={`${isLandscape ? "w-1/2 mr-2" : "w-full"}`}>
        <CardHeader>
          <CardTitle className="flex-row items-center">
            <Settings size={20} className="mr-2" />
            <Text className="text-lg font-semibold">常规设置</Text>
          </CardTitle>
          <CardDescription>管理应用的常规设置</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {settingsItems.map((item) => (
            <View
              key={item.settingKey}
              className="flex-row justify-between items-center"
            >
              <Label className="flex-row items-center">
                {item.icon}
                <Text className="ml-2">{item.label}</Text>
              </Label>
              <Switch
                checked={item.value}
                onCheckedChange={(checked) =>
                  handleSettingChange(item.settingKey as keyof GeneralSettings, checked)
                }
              />
            </View>
          ))}

          <Button
            onPress={handleSaveSettings}
            className="mt-4"
            variant="default"
          >
            <Save size={16} className="mr-2" />
            <Text>保存设置</Text>
          </Button>
        </CardContent>
      </Card>
      <Toast />
    </Animated.View>
  );
};

export default GeneralSetting;
