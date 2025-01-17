import React from "react";
import { View } from "react-native";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Moon, Sun, Monitor } from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import Toast from "react-native-toast-message";
import { useTheme } from "@/hooks/useTheme";

const ThemeSetting = () => {
  const { theme, setTheme, availableThemes } = useTheme();

  const handleThemeChange = (selectedTheme: string) => {
    setTheme(selectedTheme);
    Toast.show({
      type: "success",
      text1: "主题切换",
      text2: `已切换到${selectedTheme === 'system' ? '系统' : selectedTheme === 'light' ? '浅色' : '深色'}模式`,
    });
  };

  return (
    <Animated.View 
      entering={FadeInDown} 
      className="flex-1 p-4"
    >
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex-row items-center">
            <Monitor size={20} className="mr-2" />
            主题设置
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <View className="flex-row justify-between items-center">
            <Label className="flex-row items-center">
              <Monitor size={16} className="mr-2" />
              跟随系统
            </Label>
            <Switch
              checked={theme === "system"}
              onCheckedChange={() => handleThemeChange("system")}
            />
          </View>

          <View className="space-y-2">
            <Label className="flex-row items-center">
              <Sun size={16} className="mr-2" />
              外观模式
            </Label>
            <View className="flex-row space-x-2">
              <Button
                variant={theme === "light" ? "default" : "outline"}
                onPress={() => handleThemeChange("light")}
                className="flex-1 flex-row items-center justify-center"
              >
                <Sun size={16} className="mr-2" />
                浅色
              </Button>
              <Button
                variant={theme === "dark" ? "default" : "outline"}
                onPress={() => handleThemeChange("dark")}
                className="flex-1 flex-row items-center justify-center"
              >
                <Moon size={16} className="mr-2" />
                深色
              </Button>
              <Button
                variant={theme === "system" ? "default" : "outline"}
                onPress={() => handleThemeChange("system")}
                className="flex-1 flex-row items-center justify-center"
              >
                <Monitor size={16} className="mr-2" />
                系统
              </Button>
            </View>
          </View>
        </CardContent>
      </Card>
      <Toast />
    </Animated.View>
  );
};

export default ThemeSetting;
