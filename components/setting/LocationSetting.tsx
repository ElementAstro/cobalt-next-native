import React, { useCallback } from "react";
import { View, useWindowDimensions, ScrollView, SafeAreaView } from "react-native";
import {
  MapPin,
  Key,
  Globe2,
  RefreshCw,
  Compass,
  Navigation,
  Target,
  History,
  Settings,
  AlertTriangle,
} from "lucide-react-native";
import Animated, { FadeInDown, ZoomIn, ZoomOut } from "react-native-reanimated";
import Toast from "react-native-toast-message";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useLocationStore } from "@/stores/useLocationStore";
import LocationDialog from "./LocationDialog";

const LocationSetting: React.FC = () => {
  const { config, setConfig } = useLocationStore();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const handleRefreshLocation = useCallback(() => {
    // 模拟刷新位置逻辑
    Toast.show({
      type: "success",
      text1: "位置已刷新",
      text2: "成功获取最新位置信息",
      visibilityTime: 2000,
    });
  }, []);

  const handleSaveSettings = () => {
    Toast.show({
      type: "info",
      text1: "设置已保存",
      visibilityTime: 1500,
    });
  };

  const handleEnableCompass = () => {
    Toast.show({
      type: "success",
      text1: "指南针已启用",
      visibilityTime: 1500,
    });
  };

  const handleDisableCompass = () => {
    Toast.show({
      type: "info",
      text1: "指南针已禁用",
      visibilityTime: 1500,
    });
  };

  return (
    <SafeAreaView className="flex-1">
      <ScrollView 
        className={`flex-1 ${isLandscape ? 'flex-row flex-wrap' : ''}`}
        contentContainerStyle={{ padding: 16 }}
      >
        <View className={isLandscape ? "w-1/2 pr-2" : "w-full"}>
          <Card>
            <CardHeader>
              <CardTitle className="flex-row items-center">
                <MapPin className="mr-2" size={24} />
                位置服务设置
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <View>
                <Label>
                  Android 地图 Key <Key size={16} />
                </Label>
                <Input
                  value={config.androidMapKey}
                  onChangeText={(text) => setConfig({ androidMapKey: text })}
                  placeholder="输入 Android 地图 Key"
                />
              </View>

              <View>
                <Label>
                  iOS 地图 Key <Key size={16} />
                </Label>
                <Input
                  value={config.iosMapKey}
                  onChangeText={(text) => setConfig({ iosMapKey: text })}
                  placeholder="输入 iOS 地图 Key"
                />
              </View>

              <View>
                <Label>
                  Android 定位 Key <Key size={16} />
                </Label>
                <Input
                  value={config.androidLocationKey}
                  onChangeText={(text) => setConfig({ androidLocationKey: text })}
                  placeholder="输入 Android 定位 Key"
                />
              </View>

              <View>
                <Label>
                  iOS 定位 Key <Key size={16} />
                </Label>
                <Input
                  value={config.iosLocationKey}
                  onChangeText={(text) => setConfig({ iosLocationKey: text })}
                  placeholder="输入 iOS 定位 Key"
                />
              </View>

              <View className="flex-row items-center justify-between">
                <Label>
                  自动定位 <Globe2 size={16} />
                </Label>
                <Switch
                  checked={config.autoLocate}
                  onCheckedChange={(value: boolean) =>
                    setConfig({ autoLocate: value })
                  }
                />
              </View>

              <View className="space-y-4">
                <View className="flex-row items-center justify-between">
                  <Label>
                    定位精度 <Target size={16} />
                  </Label>
                  <View className="flex-row space-x-2">
                    <Button
                      variant={config.accuracy === "high" ? "default" : "outline"}
                      onPress={() => setConfig({ accuracy: "high" })}
                    >
                      高精度
                    </Button>
                    <Button
                      variant={
                        config.accuracy === "balanced" ? "default" : "outline"
                      }
                      onPress={() => setConfig({ accuracy: "balanced" })}
                    >
                      平衡
                    </Button>
                    <Button
                      variant={config.accuracy === "low" ? "default" : "outline"}
                      onPress={() => setConfig({ accuracy: "low" })}
                    >
                      低功耗
                    </Button>
                  </View>
                </View>

                <View>
                  <Label>
                    历史位置 <History size={16} />
                  </Label>
                  <Button
                    variant="outline"
                    className="mt-2"
                    onPress={() =>
                      Toast.show({
                        type: "info",
                        text1: "查看历史位置",
                        text2: "即将打开历史位置记录",
                        visibilityTime: 1500,
                      })
                    }
                  >
                    查看历史位置记录
                  </Button>
                </View>

                <View className="flex-row space-x-2">
                  <Button
                    onPress={handleRefreshLocation}
                    className="flex-1 flex-row items-center"
                  >
                    <RefreshCw size={16} className="mr-1" />
                    刷新位置
                  </Button>
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onPress={handleSaveSettings}
                  >
                    <Settings size={16} className="mr-1" />
                    保存设置
                  </Button>
                </View>

                {/* 新增功能模块 */}
                <View className="space-y-4 mt-4">
                  <View className="flex-row items-center justify-between">
                    <Label>
                      指南针功能 <Compass size={16} />
                    </Label>
                    <View className="flex-row space-x-2">
                      <Button
                        variant={config.compassEnabled ? "default" : "outline"}
                        onPress={handleEnableCompass}
                      >
                        启用
                      </Button>
                      <Button
                        variant={!config.compassEnabled ? "default" : "outline"}
                        onPress={handleDisableCompass}
                      >
                        禁用
                      </Button>
                    </View>
                  </View>

                  <View className="flex-row items-center justify-between">
                    <Label>
                      实时导航 <Navigation size={16} />
                    </Label>
                    <Switch
                      checked={config.realTimeNavigation}
                      onCheckedChange={(value: boolean) =>
                        setConfig({ realTimeNavigation: value })
                      }
                    />
                  </View>

                  <Animated.View
                    entering={ZoomIn.duration(300)}
                    exiting={ZoomOut.duration(300)}
                  >
                    {config.realTimeNavigation && (
                      <View className="mt-2 p-2 bg-gray-100 rounded">
                        <Label>
                          导航模式 <AlertTriangle size={16} />
                        </Label>
                        <Button
                          variant="outline"
                          className="mt-2"
                          onPress={() =>
                            Toast.show({
                              type: "info",
                              text1: "导航模式",
                              text2: "导航模式已切换",
                              visibilityTime: 1500,
                            })
                          }
                        >
                          切换导航模式
                        </Button>
                      </View>
                    )}
                  </Animated.View>
                </View>
              </View>
            </CardContent>
          </Card>
        </View>
        
        <View className={isLandscape ? "w-1/2 pl-2" : "w-full mt-4"}>
          <LocationDialog />
        </View>
      </ScrollView>
      <Toast />
    </SafeAreaView>
  );
};

export default LocationSetting;
