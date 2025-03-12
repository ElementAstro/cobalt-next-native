import React, { useState, useMemo } from "react";
import { ScrollView, View, SafeAreaView, Platform } from "react-native";
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
} from "lucide-react-native";
import Animated, {
  FadeInDown,
  SlideInRight,
  Layout,
  FadeIn,
  withSpring,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import * as Haptics from "expo-haptics";
import NotificationSetting from "./notification-setting";
import LocationSetting from "./location-setting";
import DeviceScreen from "./device-info";
import ThemeSetting from "./theme-setting";
import GeneralSetting from "./general-setting";

type SettingSection =
  | "notification"
  | "location"
  | "theme"
  | "general"
  | "device"
  | "privacy";

const AnimatedCard = Animated.createAnimatedComponent(Card);
const AnimatedView = Animated.createAnimatedComponent(View);

const SettingsPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState<SettingSection | null>(null);
  const scale = useSharedValue(1);

  // 使用 useMemo 缓存设置项数据
  const settingSections = useMemo(
    () => [
      {
        title: "常用设置",
        icon: Settings,
        items: [
          {
            id: "notification",
            label: "通知设置",
            icon: Bell,
          },
          {
            id: "location",
            label: "位置设置",
            icon: MapPin,
          },
          {
            id: "device",
            label: "设备信息",
            icon: Smartphone,
          },
          {
            id: "general",
            label: "常规设置",
            icon: Home,
          },
        ],
      },
      {
        title: "外观设置",
        icon: Palette,
        items: [
          {
            id: "theme",
            label: "主题设置",
            icon: Palette,
          },
        ],
      },
      {
        title: "隐私与安全",
        icon: Lock,
        items: [
          {
            id: "privacy",
            label: "隐私设置",
            icon: Lock,
          },
        ],
      },
      {
        title: "帮助与支持",
        icon: HelpCircle,
        items: [],
      },
    ],
    []
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = async (section: SettingSection) => {
    scale.value = withSpring(0.95, {}, () => {
      scale.value = withSpring(1);
    });
    
    // 添加触觉反馈
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    setActiveSection(section);
  };

  const renderSettingContent = () => {
    switch (activeSection) {
      case "notification":
        return <NotificationSetting />;
      case "location":
        return <LocationSetting />;
      case "theme":
        return <ThemeSetting />;
      case "general":
        return <GeneralSetting />;
      case "device":
        return <DeviceScreen />;
      default:
        return null;
    }
  };

  const renderSettingButton = (item: { id: string; label: string; icon: any }) => (
    <Button
      key={item.id}
      variant={activeSection === item.id ? "default" : "outline"}
      className="w-full h-12 native:h-14 justify-start rounded-xl bg-opacity-90 hover:bg-opacity-100 active:scale-98 transition-all duration-200"
      onPress={() => handlePress(item.id as SettingSection)}
    >
      <item.icon
        size={18}
        className="mr-3 native:h-5 native:w-5 text-primary"
      />
      <Text className="flex-1 text-base native:text-lg font-medium">
        {item.label}
      </Text>
      <ChevronRight
        size={18}
        className="native:h-5 native:w-5 opacity-50"
      />
    </Button>
  );

  return (
    <SafeAreaView className="flex-1 bg-gradient-to-b from-background to-background/95">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: 16,
        }}
      >
        <AnimatedView
          entering={FadeIn.duration(500).springify()}
          className="flex-row items-center justify-between mb-6 px-2"
        >
          <Text className="text-2xl native:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
            设置
          </Text>
          <Power className="h-6 w-6 text-primary opacity-50" />
        </AnimatedView>

        <View className="space-y-4 native:space-y-6">
          {settingSections.map((section, index) => (
            <AnimatedCard
              key={section.title}
              entering={FadeInDown.delay(index * 100)
                .duration(400)
                .springify()}
              layout={Layout.springify()}
              style={[animatedStyle]}
              className="native:rounded-2xl native:shadow-lg overflow-hidden border-primary/10 bg-gradient-to-b from-card to-card/95"
            >
              <CardHeader className="native:py-4 border-b border-border/10">
                <CardTitle className="flex-row items-center">
                  <section.icon
                    size={20}
                    className="mr-2 native:h-6 native:w-6 text-primary"
                  />
                  <Text className="text-lg native:text-xl font-semibold">
                    {section.title}
                  </Text>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 native:space-y-3 p-4 native:p-5">
                {section.items.map(renderSettingButton)}
                {section.title === "帮助与支持" && (
                  <Text className="text-muted-foreground native:text-base mt-2">
                    版本 1.0.0
                  </Text>
                )}
              </CardContent>
            </AnimatedCard>
          ))}
        </View>
      </ScrollView>

      {/* 设置内容部分 */}
      {activeSection && (
        <Animated.View
          entering={SlideInRight.duration(400).springify()}
          className="absolute inset-0 bg-background"
          style={{ elevation: 1 }}
        >
          {renderSettingContent()}
        </Animated.View>
      )}
    </SafeAreaView>
  );
};

export default SettingsPage;
