import React from "react";
import { View, Dimensions, Text } from "react-native";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import Toast from "react-native-toast-message";
import { useGeneralSettings } from "@/hooks/useGeneralSettings";

const GeneralSetting = () => {
  const { settings, updateSetting } = useGeneralSettings();
  const { width, height } = Dimensions.get("window");
  const isLandscape = width > height;

  const toggleTheme = () => {
    updateSetting("darkMode", !settings.darkMode);
    Toast.show({
      type: "success",
      text1: "主题切换",
      text2: `已切换到 ${!settings.darkMode ? "深色" : "浅色"}模式`,
    });
  };

  return (
    <Animated.View entering={FadeInDown} className="flex-1 p-4">
      <Card className={`${isLandscape ? "w-1/2 mr-2" : "w-full"}`}>
        <CardHeader>
          <CardTitle className="flex-row items-center">
            <Settings
              size={20}
              className="mr-2 text-gray-800 dark:text-gray-200"
            />
            <Text className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              常规设置
            </Text>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 自动语言 */}
          <View className="flex-row justify-between items-center">
            <Label className="flex-row items-center">
              <Globe
                size={16}
                className="mr-2 text-gray-800 dark:text-gray-200"
              />
              <Text className="text-gray-800 dark:text-gray-200">自动语言</Text>
            </Label>
            <Switch
              checked={settings.autoLanguage}
              onCheckedChange={(checked) =>
                updateSetting("autoLanguage", checked)
              }
            />
          </View>

          {/* 震动反馈 */}
          <View className="flex-row justify-between items-center">
            <Label className="flex-row items-center">
              <Phone
                size={16}
                className="mr-2 text-gray-800 dark:text-gray-200"
              />
              <Text className="text-gray-800 dark:text-gray-200">震动反馈</Text>
            </Label>
            <Switch
              checked={settings.vibration}
              onCheckedChange={(checked) => updateSetting("vibration", checked)}
            />
          </View>

          {/* 声音效果 */}
          <View className="flex-row justify-between items-center">
            <Label className="flex-row items-center">
              <Volume2
                size={16}
                className="mr-2 text-gray-800 dark:text-gray-200"
              />
              <Text className="text-gray-800 dark:text-gray-200">声音效果</Text>
            </Label>
            <Switch
              checked={settings.sound}
              onCheckedChange={(checked) => updateSetting("sound", checked)}
            />
          </View>

          {/* 夜间模式 */}
          <View className="flex-row justify-between items-center">
            <Label className="flex-row items-center">
              {settings.darkMode ? (
                <Moon
                  size={16}
                  className="mr-2 text-gray-800 dark:text-gray-200"
                />
              ) : (
                <Sun
                  size={16}
                  className="mr-2 text-gray-800 dark:text-gray-200"
                />
              )}
              <Text className="text-gray-800 dark:text-gray-200">夜间模式</Text>
            </Label>
            <Switch checked={settings.darkMode} onCheckedChange={toggleTheme} />
          </View>

          {/* 保存设置按钮 */}
          <Button
            onPress={() => {
              Toast.show({
                type: "info",
                text1: "更新",
                text2: "设置已保存",
              });
            }}
            className="mt-4 bg-blue-500 dark:bg-blue-700"
          >
            <Text className="text-white">保存设置</Text>
          </Button>
        </CardContent>
      </Card>
      <Toast />
    </Animated.View>
  );
};

export default GeneralSetting;
