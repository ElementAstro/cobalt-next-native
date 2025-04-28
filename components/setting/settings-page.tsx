import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  ScrollView,
  View,
  SafeAreaView,
  Platform,
  Pressable,
  BackHandler,
} from "react-native";
import {
  Settings,
  Bell,
  MapPin,
  Palette,
  Lock,
  HelpCircle,
  Smartphone,
  ChevronRight,
  Home,
  Power,
  ArrowLeft,
  Check,
  AlertCircle,
} from "lucide-react-native";
import Animated, {
  FadeInDown,
  SlideInRight,
  SlideOutRight,
  Layout,
  FadeIn,
  ZoomIn,
  FadeOut,
  withSpring,
  withTiming,
  useAnimatedStyle,
  useSharedValue,
  interpolate,
  Easing,
  withSequence,
} from "react-native-reanimated";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import { Badge } from "~/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "~/components/ui/alert";
import * as Haptics from "expo-haptics";
import NotificationSetting from "./notification-setting";
import LocationSetting from "./location-setting";
import DeviceScreen from "./device-info";
import ThemeSetting from "./theme-setting";
import GeneralSetting from "./general-setting";
import SettingsSkeleton from "./settings-skeleton";
import ErrorBoundary from "./error-boundary";

type SettingSection =
  | "notification"
  | "location"
  | "theme"
  | "general"
  | "device"
  | "privacy";

const AnimatedCard = Animated.createAnimatedComponent(Card);
const AnimatedView = Animated.createAnimatedComponent(View);

// 增强的设置按钮组件
interface SettingButtonProps {
  id: string;
  label: string;
  icon: any;
  isActive: boolean;
  onPress: () => void;
  description?: string;
  badge?: string;
}

const SettingButton = React.memo(
  ({
    id,
    label,
    icon: Icon,
    isActive,
    onPress,
    description,
    badge,
  }: SettingButtonProps) => {
    const scale = useSharedValue(1);
    const opacity = useSharedValue(1);
    const shadowOpacity = useSharedValue(0);
    const rotateIcon = useSharedValue(0);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [
        { scale: scale.value },
        { translateX: interpolate(scale.value, [0.95, 1], [5, 0]) },
      ],
      opacity: opacity.value,
      shadowOpacity: shadowOpacity.value,
    }));

    const iconAnimatedStyle = useAnimatedStyle(() => ({
      transform: [{ rotateZ: `${rotateIcon.value}deg` }],
    }));

    const handlePressIn = () => {
      scale.value = withSpring(0.98, {
        mass: 0.8,
        damping: 15,
      });
      opacity.value = withTiming(0.9);
      shadowOpacity.value = withTiming(0.3);
    };

    const handlePressOut = () => {
      scale.value = withSpring(1);
      opacity.value = withTiming(1);
      shadowOpacity.value = withTiming(0);
    };

    const handlePress = async () => {
      rotateIcon.value = withTiming(
        360,
        {
          duration: 500,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        },
        () => {
          rotateIcon.value = 0;
        }
      );

      // 触觉反馈
      if (Platform.OS !== "web") {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      onPress();
    };

    return (
      <Animated.View
        style={animatedStyle}
        entering={FadeIn.delay(150).duration(500).springify()}
        layout={Layout.springify()}
      >
        <Pressable
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityState={{ selected: isActive }}
          accessibilityHint={`激活${label}选项`}
          className={`w-full py-3 native:py-4 px-4 native:px-5 rounded-xl border mb-2 ${
            isActive
              ? "bg-primary/10 border-primary/20"
              : "bg-card/60 border-border"
          } active:bg-primary/15 transition-colors duration-200`}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center space-x-3 flex-1">
              <Animated.View
                className={`p-2 rounded-full ${
                  isActive ? "bg-primary/20" : "bg-primary/10"
                }`}
                style={iconAnimatedStyle}
              >
                <Icon
                  size={18}
                  className={`native:h-5 native:w-5 ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}
                />
              </Animated.View>

              <View className="space-y-0.5 flex-1">
                <Text
                  className={`text-base native:text-lg font-medium ${
                    isActive ? "text-primary" : ""
                  }`}
                >
                  {label}
                </Text>

                {description && (
                  <Text className="text-xs native:text-sm text-muted-foreground">
                    {description}
                  </Text>
                )}
              </View>
            </View>

            <View className="flex-row items-center space-x-2">
              {badge && (
                <Badge
                  variant={isActive ? "default" : "secondary"}
                  className="py-0.5 px-2"
                >
                  <Text className="text-xs">{badge}</Text>
                </Badge>
              )}

              {isActive ? (
                <Check size={18} className="text-primary" />
              ) : (
                <ChevronRight size={18} className="text-muted-foreground" />
              )}
            </View>
          </View>
        </Pressable>
      </Animated.View>
    );
  }
);

const SettingsPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState<SettingSection | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const cardScale = useSharedValue(1);
  const contentOpacity = useSharedValue(1);

  // 模拟加载状态 - 实际应用中可能是获取设置数据
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // 添加Android返回键处理
  useEffect(() => {
    if (Platform.OS === "android") {
      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          if (activeSection) {
            handleBackPress();
            return true;
          }
          return false;
        }
      );

      return () => backHandler.remove();
    }
  }, [activeSection]);

  // 使用 useMemo 缓存设置项数据
  const settingSections = useMemo(
    () => [
      {
        title: "常用设置",
        icon: Settings,
        description: "管理通知、位置等常用功能",
        items: [
          {
            id: "notification",
            label: "通知设置",
            icon: Bell,
            description: "管理应用通知方式",
            badge: "新",
          },
          {
            id: "location",
            label: "位置设置",
            icon: MapPin,
            description: "管理位置服务和权限",
          },
          {
            id: "device",
            label: "设备信息",
            icon: Smartphone,
            description: "查看设备详情与系统状态",
          },
          {
            id: "general",
            label: "常规设置",
            icon: Home,
            description: "应用基本选项管理",
          },
        ],
      },
      {
        title: "外观设置",
        icon: Palette,
        description: "自定义应用界面外观",
        items: [
          {
            id: "theme",
            label: "主题设置",
            icon: Palette,
            description: "切换浅色/深色主题和外观",
          },
        ],
      },
      {
        title: "隐私与安全",
        icon: Lock,
        description: "管理隐私和安全选项",
        items: [
          {
            id: "privacy",
            label: "隐私设置",
            icon: Lock,
            description: "管理隐私保护和数据安全",
          },
        ],
      },
      {
        title: "帮助与支持",
        icon: HelpCircle,
        description: "获取帮助和应用相关信息",
        items: [],
      },
    ],
    []
  );

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  const handlePress = useCallback(
    async (section: SettingSection) => {
      cardScale.value = withSequence(
        withTiming(0.98, { duration: 100 }),
        withTiming(1, { duration: 200 })
      );

      contentOpacity.value = withSequence(
        withTiming(0.7, { duration: 100 }),
        withTiming(1, { duration: 200 })
      );

      // 添加触觉反馈
      if (Platform.OS !== "web") {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      setActiveSection(section);
    },
    [cardScale, contentOpacity]
  );

  const handleBackPress = useCallback(async () => {
    // 触觉反馈
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setActiveSection(null);
  }, []);

  const renderSettingContent = useCallback(() => {
    // 使用ErrorBoundary包裹各个设置页面组件
    switch (activeSection) {
      case "notification":
        return (
          <ErrorBoundary>
            <NotificationSetting />
          </ErrorBoundary>
        );
      case "location":
        return (
          <ErrorBoundary>
            <LocationSetting />
          </ErrorBoundary>
        );
      case "theme":
        return (
          <ErrorBoundary>
            <ThemeSetting />
          </ErrorBoundary>
        );
      case "general":
        return (
          <ErrorBoundary>
            <GeneralSetting />
          </ErrorBoundary>
        );
      case "device":
        return (
          <ErrorBoundary>
            <DeviceScreen />
          </ErrorBoundary>
        );
      case "privacy":
        return (
          <Animated.View
            entering={FadeIn.duration(500).springify()}
            className="flex-1 justify-center items-center p-6"
          >
            <Alert
              variant="default"
              icon={Lock}
              className="w-full native:rounded-xl"
            >
              <AlertTitle className="native:text-lg">隐私设置</AlertTitle>
              <AlertDescription className="native:text-base">
                此功能正在开发中，敬请期待。
              </AlertDescription>
            </Alert>
          </Animated.View>
        );
      default:
        return null;
    }
  }, [activeSection]);

  // 处理错误重试
  const handleRetry = useCallback(() => {
    setHasError(false);
    setIsLoading(true);

    // 模拟重新加载数据
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  }, []);

  // 如果正在加载，显示骨架屏
  if (isLoading) {
    return <SettingsSkeleton />;
  }

  // 如果发生错误，显示错误界面
  if (hasError) {
    return (
      <View className="flex-1 justify-center items-center p-6">
        <Alert variant="destructive" icon={AlertCircle}>
          <AlertTitle>加载设置失败</AlertTitle>
          <AlertDescription>无法加载设置数据，请稍后再试。</AlertDescription>
        </Alert>
        <Button className="mt-4" onPress={handleRetry}>
          重试
        </Button>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gradient-to-b from-background to-background/95">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: Platform.OS === "ios" ? 40 : 24,
        }}
      >
        <AnimatedView
          entering={FadeIn.duration(500).springify()}
          className="flex-row items-center justify-between mb-6 px-2"
        >
          <Animated.Text
            entering={ZoomIn.duration(600).springify()}
            className="text-2xl native:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60"
          >
            设置
          </Animated.Text>
          <Animated.View entering={ZoomIn.delay(200).duration(600).springify()}>
            <Power className="h-6 w-6 native:h-7 native:w-7 text-primary opacity-50" />
          </Animated.View>
        </AnimatedView>

        <Animated.View
          style={contentAnimatedStyle}
          className="space-y-4 native:space-y-6"
        >
          {settingSections.map((section, index) => (
            <AnimatedCard
              key={section.title}
              entering={FadeInDown.delay(index * 100)
                .duration(400)
                .springify()}
              layout={Layout.springify()}
              style={cardAnimatedStyle}
              className="native:rounded-2xl native:shadow-lg overflow-hidden border-primary/10 bg-gradient-to-b from-card to-card/95"
            >
              <CardHeader className="native:py-4 border-b border-border/10">
                <CardTitle className="flex-row items-center justify-between">
                  <View className="flex-row items-center space-x-2">
                    <section.icon
                      size={20}
                      className="text-primary native:h-6 native:w-6"
                    />
                    <Text className="text-lg native:text-xl font-semibold">
                      {section.title}
                    </Text>
                  </View>

                  {section.items.length > 0 && (
                    <Badge variant="outline" className="opacity-70">
                      <Text className="text-xs">{section.items.length}</Text>
                    </Badge>
                  )}
                </CardTitle>
                {section.description && (
                  <Text className="text-sm native:text-base text-muted-foreground mt-1 ml-7">
                    {section.description}
                  </Text>
                )}
              </CardHeader>
              <CardContent className="p-4 native:p-5">
                {section.items.map((item) => (
                  <SettingButton
                    key={item.id}
                    id={item.id}
                    label={item.label}
                    icon={item.icon}
                    description={item.description}
                    badge={item.badge}
                    isActive={activeSection === item.id}
                    onPress={() => handlePress(item.id as SettingSection)}
                  />
                ))}
                {section.title === "帮助与支持" && (
                  <View className="mt-3 p-4 rounded-xl bg-primary/5 border border-primary/10">
                    <Text className="text-sm native:text-base text-muted-foreground">
                      应用版本:{" "}
                      <Text className="font-semibold text-primary">1.0.0</Text>
                    </Text>
                    <Text className="text-sm native:text-base text-muted-foreground mt-1">
                      最后更新:{" "}
                      <Text className="font-semibold text-primary">
                        2025-04-14
                      </Text>
                    </Text>
                  </View>
                )}
              </CardContent>
              {section.items.length === 0 && section.title !== "帮助与支持" && (
                <CardFooter className="border-t border-border/10 p-4 native:p-5">
                  <Text className="text-sm native:text-base text-muted-foreground">
                    该分类暂无设置选项
                  </Text>
                </CardFooter>
              )}
            </AnimatedCard>
          ))}
        </Animated.View>
      </ScrollView>

      {/* 设置内容部分 */}
      {activeSection && (
        <Animated.View
          entering={SlideInRight.duration(400).springify()}
          exiting={SlideOutRight.duration(300).springify()}
          className="absolute inset-0 bg-background"
          style={{ elevation: 1, zIndex: 100 }}
        >
          <SafeAreaView className="flex-1">
            <View className="flex-row items-center px-4 py-3 native:py-4 native:px-6 border-b border-border/10">
              <Pressable
                onPress={handleBackPress}
                className="p-2 rounded-full bg-primary/10 active:bg-primary/20"
                accessibilityRole="button"
                accessibilityLabel="返回"
                accessibilityHint="返回到设置主页"
              >
                <ArrowLeft size={20} className="text-primary" />
              </Pressable>
              <Text className="ml-3 text-lg native:text-xl font-semibold flex-1">
                {settingSections
                  .flatMap((section) => section.items)
                  .find((item) => item.id === activeSection)?.label || "设置"}
              </Text>
            </View>
            <View className="flex-1">{renderSettingContent()}</View>
          </SafeAreaView>
        </Animated.View>
      )}
    </SafeAreaView>
  );
};

export default SettingsPage;
