import React, { useCallback, useMemo } from "react";
import {
  View,
  ScrollView,
  SafeAreaView,
  useWindowDimensions,
} from "react-native";
import { toast } from "sonner-native";
import Animated, {
  FadeInDown,
  SlideInRight,
  BounceIn,
  ZoomIn,
} from "react-native-reanimated";
import { z } from "zod";
import {
  MapPin,
  Key,
  Globe2,
  RefreshCw,
  Compass,
  Navigation,
  Target,
  Settings,
  AlertTriangle,
  Shield,
  Map,
  Battery,
} from "lucide-react-native";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Switch } from "~/components/ui/switch";
import { Label } from "~/components/ui/label";
import { Button } from "~/components/ui/button";
import { useLocationStore } from "~/stores/settings/useLocationStore";
import LocationDialog from "./location-dialog";

// 配置校验Schema
const LocationConfigSchema = z.object({
  androidMapKey: z.string().min(1, "Android地图Key不能为空"),
  iosMapKey: z.string().min(1, "iOS地图Key不能为空"),
  androidLocationKey: z.string().min(1, "Android定位Key不能为空"),
  iosLocationKey: z.string().min(1, "iOS定位Key不能为空"),
  accuracy: z.enum(["high", "balanced", "low"]),
  autoLocate: z.boolean(),
  compassEnabled: z.boolean(),
  realTimeNavigation: z.boolean(),
});

const LocationSetting: React.FC = () => {
  const { config, setConfig } = useLocationStore();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  // 表单验证
  const validateConfig = useCallback(() => {
    try {
      LocationConfigSchema.parse(config);
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error("验证失败", {
          description: err.errors[0].message,
        });
      }
      return false;
    }
  }, [config]);

  // 性能优化: 使用useMemo缓存配置选项
  const accuracyOptions = useMemo(
    () => [
      { label: "高精度", value: "high", icon: Shield },
      { label: "平衡", value: "balanced", icon: Map },
      { label: "低功耗", value: "low", icon: Battery },
    ],
    []
  );

  const handleRefreshLocation = useCallback(() => {
    // 模拟刷新位置逻辑
    toast.success("位置已刷新", {
      description: "成功获取最新位置信息",
      duration: 2000,
    });
  }, []);

  const handleSaveSettings = useCallback(() => {
    if (validateConfig()) {
      toast.success("设置已保存");
    }
  }, [validateConfig]);

  const handleEnableCompass = () => {
    toast.success("指南针已启用", {
      duration: 1500,
    });
  };

  const handleDisableCompass = () => {
    toast.info("指南针已禁用", {
      duration: 1500,
    });
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
        <Animated.View
          entering={FadeInDown.duration(500).springify()}
          className="space-y-4 native:space-y-6"
        >
          {/* 主设置卡片 */}
          <Card className="native:rounded-2xl native:shadow-lg overflow-hidden">
            <CardHeader className="native:py-4 space-y-2 border-b border-border/10">
              <CardTitle className="flex-row items-center space-x-3">
                <MapPin
                  size={24}
                  className="text-primary native:h-7 native:w-7"
                />
                <Label className="text-xl native:text-2xl font-bold">
                  位置服务设置
                </Label>
              </CardTitle>
            </CardHeader>

            <CardContent className="native:p-4 space-y-6">
              {/* API Keys */}
              <Animated.View
                entering={SlideInRight.delay(200).springify()}
                className="space-y-4"
              >
                {/* API Key 输入框组 */}
                <View className="space-y-3 native:space-y-4">
                  <Label className="flex-row items-center space-x-2">
                    <Key size={16} className="native:h-5 native:w-5" />
                    <Label className="native:text-base font-medium">
                      API Keys
                    </Label>
                  </Label>

                  <Input
                    value={config.androidMapKey}
                    onChangeText={(text) => setConfig({ androidMapKey: text })}
                    placeholder="Android 地图 Key"
                    className="native:h-12 native:text-base native:rounded-xl"
                  />
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
                      onChangeText={(text) =>
                        setConfig({ androidLocationKey: text })
                      }
                      placeholder="输入 Android 定位 Key"
                    />
                  </View>

                  <View>
                    <Label>
                      iOS 定位 Key <Key size={16} />
                    </Label>
                    <Input
                      value={config.iosLocationKey}
                      onChangeText={(text) =>
                        setConfig({ iosLocationKey: text })
                      }
                      placeholder="输入 iOS 定位 Key"
                    />
                  </View>
                </View>
              </Animated.View>

              {/* 位置设置 */}
              <Animated.View
                entering={SlideInRight.delay(400).springify()}
                className="space-y-4"
              >
                <View className="space-y-4 native:space-y-5">
                  <View className="flex-row items-center justify-between">
                    <Label className="flex-row items-center space-x-2">
                      <Globe2 size={16} className="native:h-5 native:w-5" />
                      <Label className="native:text-base font-medium">
                        自动定位
                      </Label>
                    </Label>
                    <Switch
                      checked={config.autoLocate}
                      onCheckedChange={(value) =>
                        setConfig({ autoLocate: value })
                      }
                      className="native:scale-110"
                    />
                  </View>

                  {/* 精度选择按钮组 */}
                  <View className="space-y-2">
                    <Label className="flex-row items-center space-x-2">
                      <Target size={16} className="native:h-5 native:w-5" />
                      <Label className="native:text-base font-medium">
                        定位精度
                      </Label>
                    </Label>
                    <View className="flex-row space-x-2">
                      {accuracyOptions.map((option) => (
                        <Button
                          key={option.value}
                          variant={
                            config.accuracy === option.value
                              ? "default"
                              : "outline"
                          }
                          onPress={() =>
                            setConfig({
                              accuracy: option.value as
                                | "high"
                                | "balanced"
                                | "low",
                            })
                          }
                          className="flex-1 native:h-11 native:rounded-xl"
                        >
                          <option.icon
                            size={16}
                            className="mr-2 native:h-5 native:w-5"
                          />
                          <Label className="native:text-base">
                            {option.label}
                          </Label>
                        </Button>
                      ))}
                    </View>
                  </View>
                </View>
              </Animated.View>

              {/* 高级设置 */}
              <Animated.View
                entering={SlideInRight.delay(600).springify()}
                className="space-y-4"
              >
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

                  <Animated.View entering={ZoomIn.duration(300)}>
                    {config.realTimeNavigation && (
                      <View className="mt-2 p-2 bg-gray-100 rounded">
                        <Label>
                          导航模式 <AlertTriangle size={16} />
                        </Label>
                        <Button
                          variant="outline"
                          className="mt-2"
                          onPress={() =>
                            toast.info("导航模式", {
                              description: "导航模式已切换",
                              duration: 1500,
                            })
                          }
                        >
                          切换导航模式
                        </Button>
                      </View>
                    )}
                  </Animated.View>
                </View>
              </Animated.View>

              {/* 操作按钮 */}
              <Animated.View
                entering={BounceIn.delay(800).springify()}
                className="flex-row space-x-3"
              >
                <Button
                  variant="default"
                  className="flex-1 h-11 native:h-12 native:rounded-xl"
                  onPress={handleSaveSettings}
                >
                  <Settings size={18} className="mr-2 native:h-5 native:w-5" />
                  <Label className="native:text-base">保存设置</Label>
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 h-11 native:h-12 native:rounded-xl"
                  onPress={handleRefreshLocation}
                >
                  <RefreshCw size={18} className="mr-2 native:h-5 native:w-5" />
                  <Label className="native:text-base">刷新位置</Label>
                </Button>
              </Animated.View>
            </CardContent>
          </Card>

          {/* 位置对话框 */}
          <LocationDialog />
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default LocationSetting;
