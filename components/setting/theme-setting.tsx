import React, { useMemo, useCallback, useState, useEffect } from "react";
import {
  View,
  ScrollView,
  SafeAreaView,
  Platform,
  Pressable,
} from "react-native";
import { toast } from "sonner-native";
import { z } from "zod";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Monitor,
  Sun,
  Moon,
  Palette,
  Check,
  AlertCircle,
  EyeIcon,
  Settings2,
  ChevronRight,
  Laptop,
  MonitorSmartphone,
  RotateCcw,
  Layers,
} from "lucide-react-native";
import Animated, {
  FadeInDown,
  SlideInRight,
  BounceIn,
  Layout,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  useSharedValue,
  interpolateColor,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { Alert, AlertTitle, AlertDescription } from "~/components/ui/alert";
import { useColorScheme } from "~/lib/useColorScheme";
import { Text } from "~/components/ui/text";
import { useErrorBoundary } from "~/hooks//useErrorBoundary";

// 常量
const THEME_STORAGE_KEY = "app-theme-preference";

// Zod Schema
const ThemeSchema = z.object({
  theme: z.enum(["light", "dark", "system"]),
  systemTheme: z.enum(["light", "dark"]).optional(),
  lastChanged: z.number().optional(),
});

// Theme 类型
type Theme = z.infer<typeof ThemeSchema>;

// Theme Preview Component 优化
const ThemePreview = React.memo(({ theme }: { theme: string }) => {
  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);
  const bgColor = useSharedValue(0);

  // 根据主题改变背景颜色
  const animatedBgStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      bgColor.value,
      [0, 1, 2],
      [
        "#ffffff", // light
        "#171717", // dark
        theme === "light" ? "#ffffff" : "#171717", // system based on current theme
      ]
    );

    return {
      backgroundColor,
      borderColor: interpolateColor(
        bgColor.value,
        [0, 1, 2],
        ["#e5e5e5", "#333333", theme === "light" ? "#e5e5e5" : "#333333"]
      ),
    };
  });

  const animatedTextStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      bgColor.value,
      [0, 1, 2],
      ["#171717", "#ffffff", theme === "light" ? "#171717" : "#ffffff"]
    ),
  }));

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: withSpring(scale.value) },
      { rotateY: `${rotate.value}deg` },
    ],
  }));

  // 主题切换时的翻转动画
  useEffect(() => {
    scale.value = withSequence(
      withTiming(0.95, { duration: 150 }),
      withTiming(1, { duration: 150 })
    );

    rotate.value = withSequence(
      withTiming(90, { duration: 300 }),
      withTiming(0, { duration: 300 })
    );

    // 设置背景颜色动画值
    bgColor.value = withTiming(
      theme === "light" ? 0 : theme === "dark" ? 1 : 2,
      { duration: 300 }
    );
  }, [theme]);

  return (
    <Animated.View
      entering={BounceIn.delay(600).springify()}
      style={[animatedStyle]}
      className="w-full native:mt-4"
    >
      <Card className="native:rounded-2xl native:shadow-lg border-primary/10 overflow-hidden">
        <CardHeader className="native:py-4 border-b border-border/10">
          <CardTitle className="flex-row items-center space-x-2">
            <EyeIcon size={20} className="text-primary native:h-6 native:w-6" />
            <Text className="native:text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
              主题预览
            </Text>
          </CardTitle>
          <CardDescription className="native:text-base">
            当前外观模式的实时预览
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 native:p-5">
          <Animated.View
            style={[animatedBgStyle]}
            className="p-4 rounded-xl border"
          >
            <Animated.Text
              style={[animatedTextStyle]}
              className="text-base native:text-lg font-medium"
            >
              {theme === "system"
                ? "跟随系统"
                : theme === "light"
                ? "浅色主题"
                : "深色主题"}
            </Animated.Text>
            <Animated.Text
              style={[animatedTextStyle]}
              className="text-sm mt-2 opacity-70"
            >
              此预览显示了当前主题下的外观效果
            </Animated.Text>
          </Animated.View>
        </CardContent>
      </Card>
    </Animated.View>
  );
});

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const ThemeSetting = () => {
  const { colorScheme, setColorScheme } = useColorScheme();
  const [themeHistory, setThemeHistory] = useState<Theme[]>([]);
  const [isResetting, setIsResetting] = useState(false);
  const { handleError } = useErrorBoundary();

  const scale = useSharedValue(1);

  // 加载保存的主题历史
  useEffect(() => {
    const loadThemeHistory = async () => {
      try {
        const savedData = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedData) {
          const parsedData = JSON.parse(savedData);
          if (Array.isArray(parsedData)) {
            setThemeHistory(parsedData.slice(-5)); // 只保留最近5个
          }
        }
      } catch (error) {
        console.error("Failed to load theme history:", error);
      }
    };

    loadThemeHistory();
  }, []);

  // 保存主题配置到历史记录
  const saveThemeToHistory = useCallback(
    async (newTheme: string) => {
      try {
        const themeData: Theme = {
          theme: newTheme as "light" | "dark" | "system",
          lastChanged: Date.now(),
        };

        const newHistory = [...themeHistory, themeData].slice(-5); // 保留最近5次
        setThemeHistory(newHistory);

        await AsyncStorage.setItem(
          THEME_STORAGE_KEY,
          JSON.stringify(newHistory)
        );
      } catch (error) {
        console.error("Failed to save theme history:", error);
      }
    },
    [themeHistory]
  );

  const handleThemeChange = useCallback(
    async (selectedTheme: string) => {
      try {
        if (Platform.OS !== "web") {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        // 添加输入验证
        const validated = ThemeSchema.parse({ theme: selectedTheme });
        setColorScheme(validated.theme);

        // 保存到历史记录
        saveThemeToHistory(selectedTheme);

        scale.value = withSequence(withSpring(0.95), withSpring(1));

        toast.success("主题已更新", {
          description: `已切换到${
            selectedTheme === "system"
              ? "系统"
              : selectedTheme === "light"
              ? "浅色"
              : "深色"
          }模式`,
          icon: <Check size={20} className="text-success" />,
        });
      } catch (error) {
        handleError(error, "主题更新失败");
        toast.error("更新失败", {
          description: error instanceof Error ? error.message : "未知错误",
          icon: <AlertCircle size={20} className="text-destructive" />,
        });
      }
    },
    [setColorScheme, scale, saveThemeToHistory, handleError]
  );

  // 重置为系统默认主题
  const resetToSystemTheme = useCallback(async () => {
    try {
      setIsResetting(true);

      if (Platform.OS !== "web") {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Warning
        );
      }

      setColorScheme("system");

      // 记录重置操作
      saveThemeToHistory("system");

      toast.success("已重置", {
        description: "已恢复到系统默认主题",
        icon: <RotateCcw size={20} className="text-warning" />,
      });
    } catch (error) {
      handleError(error, "重置主题失败");
    } finally {
      setIsResetting(false);
    }
  }, [setColorScheme, saveThemeToHistory, handleError]);

  const themeButtons = useMemo(
    () => [
      {
        value: "light",
        label: "浅色",
        icon: Sun,
        description: "使用明亮色彩主题",
      },
      {
        value: "dark",
        label: "深色",
        icon: Moon,
        description: "使用暗色主题，适合夜间使用",
      },
      {
        value: "system",
        label: "系统",
        icon: MonitorSmartphone,
        description: "跟随系统主题自动切换",
      },
    ],
    []
  );

  const currentTheme = colorScheme === null ? "system" : colorScheme;
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <SafeAreaView className="flex-1 bg-gradient-to-b from-background to-background/95">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 32,
        }}
      >
        <Animated.View
          entering={FadeInDown.duration(500).springify()}
          className="space-y-4 native:space-y-6"
        >
          <Card className="native:rounded-2xl native:shadow-lg overflow-hidden border-primary/10 bg-gradient-to-b from-card to-card/95">
            <CardHeader className="native:py-4 space-y-2 border-b border-border/10">
              <CardTitle className="flex-row items-center space-x-3">
                <Settings2
                  size={24}
                  className="text-primary native:h-7 native:w-7"
                />
                <Text className="text-xl native:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
                  主题设置
                </Text>
              </CardTitle>
              <CardDescription className="native:text-base text-muted-foreground/80">
                自定义应用的外观主题
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 p-4 native:p-5">
              <Animated.View
                entering={SlideInRight.delay(200).springify()}
                layout={Layout.springify()}
                style={animatedStyle}
              >
                <Pressable
                  onPress={() => handleThemeChange("system")}
                  className="py-4 px-4 native:py-5 native:px-5 rounded-xl bg-primary/5 mb-4"
                >
                  <View className="flex-row justify-between items-center">
                    <View className="flex-row items-center space-x-3">
                      <View className="bg-primary/10 p-2 rounded-full">
                        <Laptop
                          size={20}
                          className="text-primary native:h-6 native:w-6"
                        />
                      </View>
                      <View>
                        <Text className="native:text-lg font-medium">
                          跟随系统
                        </Text>
                        <Text className="text-sm text-muted-foreground mt-1">
                          自动匹配系统主题设置
                        </Text>
                      </View>
                    </View>
                    <Switch
                      checked={currentTheme === "system"}
                      onCheckedChange={() => handleThemeChange("system")}
                      className="native:scale-110 data-[state=checked]:bg-primary"
                    />
                  </View>
                </Pressable>
              </Animated.View>

              <Animated.View
                entering={SlideInRight.delay(400).springify()}
                layout={Layout.springify()}
                className="space-y-4"
              >
                <Label className="flex-row items-center space-x-3">
                  <View className="bg-primary/10 p-2 rounded-full">
                    <Palette
                      size={20}
                      className="text-primary native:h-6 native:w-6"
                    />
                  </View>
                  <View>
                    <Text className="native:text-lg font-medium">外观模式</Text>
                    <Text className="text-sm text-muted-foreground mt-1">
                      选择您喜欢的显示主题
                    </Text>
                  </View>
                </Label>

                <View className="space-y-3">
                  {themeButtons.map(
                    ({ value, label, icon: Icon, description }) => (
                      <AnimatedPressable
                        key={value}
                        onPress={() => handleThemeChange(value)}
                        className={`p-4 native:p-5 rounded-xl border ${
                          currentTheme === value
                            ? "bg-primary/10 border-primary/20"
                            : "border-border bg-primary/5"
                        }`}
                      >
                        <View className="flex-row items-center justify-between">
                          <View className="flex-row items-center space-x-3">
                            <View className="bg-primary/10 p-2 rounded-full">
                              <Icon
                                size={20}
                                className="text-primary native:h-6 native:w-6"
                              />
                            </View>
                            <View>
                              <Text className="native:text-lg font-medium">
                                {label}
                              </Text>
                              <Text className="text-sm text-muted-foreground mt-1">
                                {description}
                              </Text>
                            </View>
                          </View>
                          {currentTheme === value && (
                            <Check size={20} className="text-primary" />
                          )}
                        </View>
                      </AnimatedPressable>
                    )
                  )}
                </View>
              </Animated.View>

              {/* 主题历史记录 */}
              {themeHistory.length > 0 && (
                <Animated.View
                  entering={SlideInRight.delay(500).springify()}
                  className="space-y-3 mt-2"
                >
                  <Label className="flex-row items-center space-x-3">
                    <View className="bg-primary/10 p-2 rounded-full">
                      <Layers
                        size={20}
                        className="text-primary native:h-6 native:w-6"
                      />
                    </View>
                    <Text className="native:text-lg font-medium">
                      最近的主题变更
                    </Text>
                  </Label>

                  <View className="bg-primary/5 rounded-xl p-3 native:p-4">
                    {themeHistory
                      .slice()
                      .reverse()
                      .map((item, index) => (
                        <View
                          key={index}
                          className="flex-row justify-between items-center py-2 border-b border-border/10 last:border-b-0"
                        >
                          <View className="flex-row items-center space-x-2">
                            {item.theme === "light" ? (
                              <Sun size={16} className="text-primary" />
                            ) : item.theme === "dark" ? (
                              <Moon size={16} className="text-primary" />
                            ) : (
                              <MonitorSmartphone
                                size={16}
                                className="text-primary"
                              />
                            )}
                            <Text className="text-sm native:text-base">
                              {item.theme === "light"
                                ? "浅色"
                                : item.theme === "dark"
                                ? "深色"
                                : "系统"}
                            </Text>
                          </View>

                          {item.lastChanged && (
                            <Text className="text-xs text-muted-foreground">
                              {new Date(item.lastChanged).toLocaleString()}
                            </Text>
                          )}
                        </View>
                      ))}
                  </View>
                </Animated.View>
              )}
            </CardContent>

            <CardFooter className="p-4 native:p-5 border-t border-border/10">
              <Button
                variant="outline"
                className="w-full h-11 native:h-12 native:rounded-xl"
                onPress={resetToSystemTheme}
                disabled={isResetting || currentTheme === "system"}
              >
                <RotateCcw
                  size={18}
                  className={`mr-2 native:h-5 native:w-5 ${
                    isResetting ? "animate-spin" : ""
                  }`}
                />
                <Text className="native:text-base">
                  {isResetting ? "重置中..." : "重置为系统主题"}
                </Text>
              </Button>
            </CardFooter>
          </Card>

          <ThemePreview theme={currentTheme} />
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ThemeSetting;
