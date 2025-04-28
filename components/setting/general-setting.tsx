import React, { useMemo, useCallback } from "react";
import {
  ScrollView,
  SafeAreaView,
  Platform,
  Pressable,
  View,
} from "react-native";
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
  ArrowRight,
} from "lucide-react-native";
import Animated, {
  FadeInDown,
  SlideInRight,
  Layout,
  BounceIn,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  useSharedValue,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useGeneralStore } from "~/stores/settings/useGeneralStore";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "~/components/ui/card";
import { Text } from "~/components/ui/text";
import { Switch } from "~/components/ui/switch";
import { Label } from "~/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "~/components/ui/alert";

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
  description?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const SettingItem = ({
  icon: Icon,
  label,
  value,
  onToggle,
  description,
}: SettingItemProps) => {
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rotation.value}deg` }],
  }));

  const handlePress = async () => {
    scale.value = withSequence(withSpring(0.95), withSpring(1));
    rotation.value = withSequence(
      withTiming(value ? -180 : 180, { duration: 300 }),
      withTiming(0)
    );

    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    onToggle(!value);
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      style={animatedStyle}
      className="py-4 native:py-5 px-4 native:px-5 rounded-xl bg-primary/5 mb-3"
    >
      <Animated.View
        entering={SlideInRight.delay(200).springify()}
        layout={Layout.springify()}
        className="space-y-2"
      >
        <View className="flex-row justify-between items-center">
          <Label className="flex-row items-center space-x-3 native:space-x-4">
            <View className="bg-primary/10 p-2 rounded-full">
              <Icon size={20} className="text-primary native:h-6 native:w-6" />
            </View>
            <View>
              <Text className="text-base native:text-lg font-medium">
                {label}
              </Text>
              {description && (
                <Text className="text-sm text-muted-foreground mt-1">
                  {description}
                </Text>
              )}
            </View>
          </Label>
          <Switch
            checked={value}
            onCheckedChange={onToggle}
            className="native:scale-110 data-[state=checked]:bg-primary"
          />
        </View>
      </Animated.View>
    </AnimatedPressable>
  );
};

const GeneralSetting = () => {
  const { autoLanguage, vibration, sound, darkMode, updateSetting } =
    useGeneralStore();

  const settingsItems = useMemo(
    () => [
      {
        label: "自动语言",
        value: autoLanguage,
        icon: Languages,
        settingKey: "autoLanguage",
        description: "根据系统语言自动切换",
      },
      {
        label: "震动反馈",
        value: vibration,
        icon: Shapes,
        settingKey: "vibration",
        description: "开启以获得更好的触觉反馈",
      },
      {
        label: "声音效果",
        value: sound,
        icon: Volume,
        settingKey: "sound",
        description: "操作时播放提示音",
      },
      {
        label: "夜间模式",
        value: darkMode,
        icon: darkMode ? Moon : Sun,
        settingKey: "darkMode",
        description: "切换深色/浅色主题",
      },
    ],
    [autoLanguage, vibration, sound, darkMode]
  );

  const handleSettingChange = useCallback(
    async (key: keyof GeneralSettings, value: boolean) => {
      try {
        if (Platform.OS !== "web") {
          await Haptics.notificationAsync(
            value
              ? Haptics.NotificationFeedbackType.Success
              : Haptics.NotificationFeedbackType.Warning
          );
        }

        updateSetting(key, value);
        toast.success("设置已更新", {
          description: `${value ? "已开启" : "已关闭"}${
            key === "autoLanguage"
              ? "自动语言"
              : key === "vibration"
              ? "震动反馈"
              : key === "sound"
              ? "声音效果"
              : "夜间模式"
          }`,
          icon: <CheckCircle2 size={20} className="text-success" />,
        });
      } catch (error) {
        toast.error("设置失败", {
          description: error instanceof Error ? error.message : "未知错误",
          icon: <AlertCircle size={20} className="text-destructive" />,
        });
      }
    },
    [updateSetting]
  );

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
                <Settings
                  size={24}
                  className="text-primary native:h-7 native:w-7"
                />
                <Text className="text-xl native:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
                  常规设置
                </Text>
              </CardTitle>
              <CardDescription className="native:text-base text-muted-foreground/80">
                管理应用的基本设置选项
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 native:space-y-5 p-4 native:p-5">
              {settingsItems.map((item, index) => (
                <Animated.View
                  key={item.settingKey}
                  entering={SlideInRight.delay(index * 100).springify()}
                >
                  <SettingItem
                    icon={item.icon}
                    label={item.label}
                    value={item.value}
                    description={item.description}
                    onToggle={(checked: boolean) =>
                      handleSettingChange(
                        item.settingKey as keyof GeneralSettings,
                        checked
                      )
                    }
                  />
                </Animated.View>
              ))}

              <Animated.View
                entering={BounceIn.delay(400).springify()}
                className="mt-4"
              >
                <Alert
                  variant="default"
                  icon={RefreshCw}
                  className="native:rounded-xl native:py-4 bg-primary/10 border-primary/20"
                >
                  <AlertTitle className="native:text-lg font-semibold flex-row items-center">
                    <ArrowRight size={16} className="mr-2 text-primary" />
                    自动保存
                  </AlertTitle>
                  <AlertDescription className="native:text-base text-muted-foreground/90">
                    设置会自动保存，无需手动操作
                  </AlertDescription>
                </Alert>
              </Animated.View>
            </CardContent>
          </Card>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default GeneralSetting;
