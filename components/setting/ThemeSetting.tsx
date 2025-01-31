import React, { useMemo } from "react";
import { View, useWindowDimensions } from "react-native";
import { toast } from "sonner-native";
import { z } from "zod";
import {
  Monitor,
  Sun,
  Moon,
  Palette,
  Check,
  AlertCircle,
  EyeIcon,
  Settings2,
} from "lucide-react-native";
import Animated, { FadeInDown, SlideInRight } from "react-native-reanimated";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useTheme } from "@/hooks/useTheme";
import { Text } from "@/components/ui/text";

// Zod Schema
const ThemeSchema = z.object({
  theme: z.enum(["light", "dark", "system"]),
  systemTheme: z.enum(["light", "dark"]).optional(),
});

// Theme Preview Component
const ThemePreview = React.memo(({ theme }: { theme: string }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex-row items-center space-x-2">
        <EyeIcon size={20} className="text-primary" />
        <Text>主题预览</Text>
      </CardTitle>
    </CardHeader>
    <CardContent>
      <Alert variant="default" icon={Palette}>
        <AlertTitle>当前主题</AlertTitle>
        <AlertDescription>
          {theme === "system"
            ? "跟随系统"
            : theme === "light"
            ? "浅色模式"
            : "深色模式"}
        </AlertDescription>
      </Alert>
    </CardContent>
  </Card>
));

const ThemeSetting = () => {
  const { theme, setTheme } = useTheme();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const handleThemeChange = async (selectedTheme: string) => {
    try {
      const validated = ThemeSchema.parse({ theme: selectedTheme });
      setTheme(validated.theme);

      toast.success("主题已更新", {
        description: `已切换到${
          selectedTheme === "system"
            ? "系统"
            : selectedTheme === "light"
            ? "浅色"
            : "深色"
        }模式`,
        icon: <Check size={20} />,
      });
    } catch (error) {
      toast.error("更新失败", {
        description: error instanceof Error ? error.message : "未知错误",
        icon: <AlertCircle size={20} />,
      });
    }
  };

  const themeButtons = useMemo(
    () => [
      {
        value: "light",
        label: "浅色",
        icon: Sun,
      },
      {
        value: "dark",
        label: "深色",
        icon: Moon,
      },
      {
        value: "system",
        label: "系统",
        icon: Monitor,
      },
    ],
    []
  );

  return (
    <Animated.View
      entering={FadeInDown.duration(500)}
      className="flex-1 p-2 md:p-4"
    >
      <View className="flex-1 flex-col sm:flex-row sm:space-x-2 space-y-2 sm:space-y-0">
        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="flex-row items-center space-x-2">
              <Settings2 size={24} className="text-primary" />
              <Text className="text-xl font-bold">主题设置</Text>
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            <Animated.View entering={SlideInRight.delay(200)}>
              <View className="flex-row justify-between items-center">
                <Label className="flex-row items-center space-x-2">
                  <Monitor size={18} className="text-foreground" />
                  <Text>跟随系统</Text>
                </Label>
                <Switch
                  checked={theme === "system"}
                  onCheckedChange={() => handleThemeChange("system")}
                />
              </View>
            </Animated.View>

            <Animated.View entering={SlideInRight.delay(400)}>
              <Label className="flex-row items-center space-x-2 mb-4">
                <Palette size={18} className="text-foreground" />
                <Text>外观模式</Text>
              </Label>

              <View className="flex-row space-x-2">
                {themeButtons.map(({ value, label, icon: Icon }) => (
                  <Button
                    key={value}
                    variant={theme === value ? "default" : "outline"}
                    onPress={() => handleThemeChange(value)}
                    className="flex-1 flex-row items-center justify-center space-x-2"
                  >
                    <Icon size={16} />
                    <Text>{label}</Text>
                  </Button>
                ))}
              </View>
            </Animated.View>
          </CardContent>
        </Card>

        <View className="flex-1">
          <ThemePreview theme={theme} />
        </View>
      </View>
    </Animated.View>
  );
};

export default ThemeSetting;
