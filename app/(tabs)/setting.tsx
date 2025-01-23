import React, { useState } from "react";
import {
  View,
  Text,
  useWindowDimensions,
  SafeAreaView,
  ScrollView,
} from "react-native";
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
import NotificationSetting from "@/components/setting/NotificationSetting";
import LocationSetting from "@/components/setting/LocationSetting";
import DeviceScreen from "@/components/setting/DeviceInfo";
import ThemeSetting from "@/components/setting/ThemeSetting";
import GeneralSetting from "@/components/setting/GeneralSetting";

type SettingSection =
  | "notification"
  | "location"
  | "theme"
  | "general"
  | "device"
  | "privacy";

const SettingsPage: React.FC = () => {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
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
    <SafeAreaView className="flex-1">
      <View className={`flex-1 p-4 ${isLandscape ? "flex-row" : ""}`}>
        <ScrollView className={`${isLandscape ? "w-1/3 mr-4" : ""} space-y-4`}>
          <Text className="text-2xl font-bold mb-4">设置</Text>

          {/* 常用设置卡片 */}
          <Animated.View
            entering={FadeInDown.delay(100).duration(300)}
            className="flex-1"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex-row items-center">
                  <Settings size={20} className="mr-2" />
                  常用设置
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-row flex-wrap">
                <Button
                  variant={
                    activeSection === "notification" ? "default" : "outline"
                  }
                  className="m-1 flex-row items-center"
                  onPress={() => setActiveSection("notification")}
                >
                  <Bell size={16} className="mr-2 text-white" />
                  <Text className="text-white">通知设置</Text>
                </Button>
                <Button
                  variant={activeSection === "location" ? "default" : "outline"}
                  className="m-1 flex-row items-center"
                  onPress={() => setActiveSection("location")}
                >
                  <MapPin size={16} className="mr-2 text-white" />
                  <Text className="text-white">位置设置</Text>
                </Button>
                <Button
                  variant={activeSection === "device" ? "default" : "outline"}
                  className="m-1 flex-row items-center"
                  onPress={() => setActiveSection("device")}
                >
                  <Smartphone size={16} className="mr-2 text-white" />
                  <Text className="text-white">设备信息</Text>
                </Button>
                <Button
                  variant={activeSection === "general" ? "default" : "outline"}
                  className="m-1 flex-row items-center"
                  onPress={() => setActiveSection("general")}
                >
                  <Settings size={16} className="mr-2 text-white" />
                  <Text className="text-white">常规设置</Text>
                </Button>
              </CardContent>
            </Card>
          </Animated.View>

          {/* 外观设置卡片 */}
          <Animated.View entering={FadeInDown.delay(200).duration(300)}>
            <Card>
              <CardHeader>
                <CardTitle className="flex-row items-center">
                  <Palette size={20} className="mr-2" />
                  外观设置
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  variant={activeSection === "theme" ? "default" : "outline"}
                  className="m-1 flex-row items-center"
                  onPress={() => setActiveSection("theme")}
                >
                  <Text className="text-white">主题设置</Text>
                </Button>
              </CardContent>
            </Card>
          </Animated.View>

          {/* 隐私与安全卡片 */}
          <Animated.View entering={FadeInDown.delay(300).duration(300)}>
            <Card>
              <CardHeader>
                <CardTitle className="flex-row items-center">
                  <Lock size={20} className="mr-2" />
                  隐私与安全
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  variant={activeSection === "privacy" ? "default" : "outline"}
                  className="m-1 flex-row items-center"
                  onPress={() => setActiveSection("privacy")}
                >
                  <Text className="text-white">隐私设置</Text>
                </Button>
              </CardContent>
            </Card>
          </Animated.View>

          {/* 帮助与支持卡片 */}
          <Animated.View entering={FadeInDown.delay(400).duration(300)}>
            <Card>
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
        </ScrollView>
        <ScrollView
          className={`${isLandscape ? "w-2/3 mr-4" : "w-1/3"} space-y-4`}
        >
          {/* 设置内容区域 */}
          {activeSection ? (
            <Animated.View
              entering={FadeInDown.duration(300)}
              className={`${isLandscape ? "flex-1" : "mt-4"}`}
            >
              {renderSettingContent()}
            </Animated.View>
          ) : (
            <View
              className={`${
                isLandscape ? "flex-1" : ""
              } justify-center items-center`}
            >
              <Text className="text-gray-500">请选择一个设置项</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default SettingsPage;
