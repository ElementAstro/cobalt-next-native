import React, { useState } from "react";
import { ScrollView, View, Text, SafeAreaView } from "react-native";
import {
  Settings,
  Bell,
  MapPin,
  Palette,
  Lock,
  HelpCircle,
  Smartphone,
} from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import NotificationSetting from "./NotificationSetting";
import LocationSetting from "./LocationSetting";
import DeviceScreen from "./DeviceInfo";
import ThemeSetting from "./ThemeSetting";
import GeneralSetting from "./GeneralSetting";

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
      <View className="flex-1 p-2 md:p-4 flex-col sm:flex-row">
        <View className="flex-1 sm:w-1/3 sm:mr-2">
          <Text className="text-xl md:text-2xl font-bold mb-4">设置</Text>
          
          <View className="space-y-2">
            {/* 常用设置卡片 */}
            <Animated.View entering={FadeInDown.delay(100).duration(300)}>
              <Card className="p-2">
                <CardHeader>
                  <CardTitle className="flex-row items-center">
                    <Settings size={20} className="mr-2" />
                    常用设置
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-row flex-wrap gap-1">
                  <Button
                    variant={
                      activeSection === "notification" ? "default" : "outline"
                    }
                    className="m-1"
                    onPress={() => setActiveSection("notification")}
                  >
                    <Bell size={16} className="mr-2" />
                    通知设置
                  </Button>
                  <Button
                    variant={activeSection === "location" ? "default" : "outline"}
                    className="m-1"
                    onPress={() => setActiveSection("location")}
                  >
                    <MapPin size={16} className="mr-2" />
                    位置设置
                  </Button>
                  <Button
                    variant={activeSection === "device" ? "default" : "outline"}
                    className="m-1"
                    onPress={() => setActiveSection("device")}
                  >
                    <Smartphone size={16} className="mr-2" />
                    设备信息
                  </Button>
                  <Button
                    variant={activeSection === "general" ? "default" : "outline"}
                    className="m-1"
                    onPress={() => setActiveSection("general")}
                  >
                    <Settings size={16} className="mr-2" />
                    常规设置
                  </Button>
                </CardContent>
              </Card>
            </Animated.View>

            {/* 外观设置卡片 */}
            <Animated.View entering={FadeInDown.delay(200).duration(300)}>
              <Card className="p-2">
                <CardHeader>
                  <CardTitle className="flex-row items-center">
                    <Palette size={20} className="mr-2" />
                    外观设置
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Button
                    variant={activeSection === "theme" ? "default" : "outline"}
                    className="m-1"
                    onPress={() => setActiveSection("theme")}
                  >
                    主题设置
                  </Button>
                </CardContent>
              </Card>
            </Animated.View>

            {/* 隐私与安全卡片 */}
            <Animated.View entering={FadeInDown.delay(300).duration(300)}>
              <Card className="p-2">
                <CardHeader>
                  <CardTitle className="flex-row items-center">
                    <Lock size={20} className="mr-2" />
                    隐私与安全
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Button
                    variant={activeSection === "privacy" ? "default" : "outline"}
                    className="m-1"
                    onPress={() => setActiveSection("privacy")}
                  >
                    隐私设置
                  </Button>
                </CardContent>
              </Card>
            </Animated.View>

            {/* 帮助与支持卡片 */}
            <Animated.View entering={FadeInDown.delay(400).duration(300)}>
              <Card className="p-2">
                <CardHeader>
                  <CardTitle className="flex-row items-center">
                    <HelpCircle size={20} className="mr-2" />
                    帮助与支持
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Text className="text-gray-500">版本 1.0.0</Text>
                </CardContent>
              </Card>
            </Animated.View>
          </View>
        </View>

        <View className="flex-1 mt-2 sm:mt-0 sm:w-2/3">
          {activeSection && (
            <Animated.View
              entering={FadeInDown.duration(300)}
              className="flex-1"
            >
              {renderSettingContent()}
            </Animated.View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

export default SettingsPage;
