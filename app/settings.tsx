import React, { useState } from "react";
import { SafeAreaView, ScrollView, View } from "react-native";
import {
  Settings,
  Bell,
  MapPin,
  Palette,
  Lock,
  HelpCircle,
  Smartphone,
  ChevronRight,
} from "lucide-react-native";
import Animated, {
  FadeInDown,
  SlideInRight,
  Layout,
  FadeIn,
} from "react-native-reanimated";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import NotificationSetting from "~/components/setting/notification-setting";
import LocationSetting from "~/components/setting/location-setting";
import DeviceScreen from "~/components/setting/device-info";
import ThemeSetting from "~/components/setting/theme-setting";
import GeneralSetting from "~/components/setting/general-setting";

const AnimatedCard = Animated.createAnimatedComponent(Card);

type SettingSection =
  | "notification"
  | "location"
  | "theme"
  | "general"
  | "device"
  | "privacy";

const SettingsPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState<SettingSection | null>(
    null
  );

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

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 32,
        }}
      >
        <Text className="text-2xl native:text-3xl font-bold mb-4 px-2">
          设置
        </Text>

        <View className="space-y-4 native:space-y-6">
          {/* 常用设置卡片 */}
          <AnimatedCard
            entering={FadeInDown.delay(100).duration(300).springify()}
            layout={Layout.springify()}
            className="native:rounded-2xl native:shadow-lg"
          >
            <CardHeader className="native:py-4">
              <CardTitle className="flex-row items-center">
                <Settings size={20} className="mr-2 native:h-6 native:w-6" />
                <Text className="text-lg native:text-xl font-semibold">
                  常用设置
                </Text>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 native:space-y-3">
              <Button
                variant={
                  activeSection === "notification" ? "default" : "outline"
                }
                className="w-full h-12 native:h-14 justify-start rounded-xl"
                onPress={() => setActiveSection("notification")}
              >
                <Bell size={18} className="mr-3 native:h-5 native:w-5" />
                <Text className="flex-1 text-base native:text-lg font-medium">
                  通知设置
                </Text>
                <ChevronRight
                  size={18}
                  className="native:h-5 native:w-5 opacity-50"
                />
              </Button>

              <Button
                variant={activeSection === "location" ? "default" : "outline"}
                className="w-full h-12 native:h-14 justify-start rounded-xl"
                onPress={() => setActiveSection("location")}
              >
                <MapPin size={18} className="mr-3 native:h-5 native:w-5" />
                <Text className="flex-1 text-base native:text-lg font-medium">
                  位置设置
                </Text>
                <ChevronRight
                  size={18}
                  className="native:h-5 native:w-5 opacity-50"
                />
              </Button>

              <Button
                variant={activeSection === "device" ? "default" : "outline"}
                className="w-full h-12 native:h-14 justify-start rounded-xl"
                onPress={() => setActiveSection("device")}
              >
                <Smartphone size={18} className="mr-3 native:h-5 native:w-5" />
                <Text className="flex-1 text-base native:text-lg font-medium">
                  设备信息
                </Text>
                <ChevronRight
                  size={18}
                  className="native:h-5 native:w-5 opacity-50"
                />
              </Button>

              <Button
                variant={activeSection === "general" ? "default" : "outline"}
                className="w-full h-12 native:h-14 justify-start rounded-xl"
                onPress={() => setActiveSection("general")}
              >
                <Settings size={18} className="mr-3 native:h-5 native:w-5" />
                <Text className="flex-1 text-base native:text-lg font-medium">
                  常规设置
                </Text>
                <ChevronRight
                  size={18}
                  className="native:h-5 native:w-5 opacity-50"
                />
              </Button>
            </CardContent>
          </AnimatedCard>

          {/* 外观设置卡片 */}
          <AnimatedCard
            entering={FadeInDown.delay(200).duration(300).springify()}
            layout={Layout.springify()}
            className="native:rounded-2xl native:shadow-lg"
          >
            <CardHeader className="native:py-4">
              <CardTitle className="flex-row items-center">
                <Palette size={20} className="mr-2 native:h-6 native:w-6" />
                <Text className="text-lg native:text-xl font-semibold">
                  外观设置
                </Text>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 native:space-y-3">
              <Button
                variant={activeSection === "theme" ? "default" : "outline"}
                className="w-full h-12 native:h-14 justify-start rounded-xl"
                onPress={() => setActiveSection("theme")}
              >
                <Text className="flex-1 text-base native:text-lg font-medium">
                  主题设置
                </Text>
                <ChevronRight
                  size={18}
                  className="native:h-5 native:w-5 opacity-50"
                />
              </Button>
            </CardContent>
          </AnimatedCard>

          {/* 隐私与安全卡片 */}
          <AnimatedCard
            entering={FadeInDown.delay(300).duration(300).springify()}
            layout={Layout.springify()}
            className="native:rounded-2xl native:shadow-lg"
          >
            <CardHeader className="native:py-4">
              <CardTitle className="flex-row items-center">
                <Lock size={20} className="mr-2 native:h-6 native:w-6" />
                <Text className="text-lg native:text-xl font-semibold">
                  隐私与安全
                </Text>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 native:space-y-3">
              <Button
                variant={activeSection === "privacy" ? "default" : "outline"}
                className="w-full h-12 native:h-14 justify-start rounded-xl"
                onPress={() => setActiveSection("privacy")}
              >
                <Text className="flex-1 text-base native:text-lg font-medium">
                  隐私设置
                </Text>
                <ChevronRight
                  size={18}
                  className="native:h-5 native:w-5 opacity-50"
                />
              </Button>
            </CardContent>
          </AnimatedCard>

          {/* 帮助与支持卡片 */}
          <AnimatedCard
            entering={FadeInDown.delay(400).duration(300).springify()}
            layout={Layout.springify()}
            className="native:rounded-2xl native:shadow-lg"
          >
            <CardHeader className="native:py-4">
              <CardTitle className="flex-row items-center">
                <HelpCircle size={20} className="mr-2 native:h-6 native:w-6" />
                <Text className="text-lg native:text-xl font-semibold">
                  帮助与支持
                </Text>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Text className="text-muted-foreground native:text-base">
                版本 1.0.0
              </Text>
            </CardContent>
          </AnimatedCard>
        </View>
      </ScrollView>

      {/* 设置内容部分 */}
      {activeSection && (
        <Animated.View
          entering={SlideInRight.duration(300).springify()}
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
