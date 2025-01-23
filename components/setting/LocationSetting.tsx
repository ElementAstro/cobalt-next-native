import React, { useCallback, useMemo } from "react";
import {
  View,
  useWindowDimensions,
  ScrollView,
  SafeAreaView,
  Text,
} from "react-native";
import { toast } from "sonner-native";
import { z } from "zod";
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
  Shield,
  Map,
  Battery,
} from "lucide-react-native";
import Animated, { FadeIn, ZoomIn } from "react-native-reanimated";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useLocationStore } from "@/stores/useLocationStore";
import LocationDialog from "./LocationDialog";

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
    <SafeAreaView className="flex-1">
      <ScrollView
        className={`flex-1 ${isLandscape ? "flex-row flex-wrap" : ""}`}
        contentContainerStyle={{ padding: 16 }}
      >
        <View className={isLandscape ? "w-1/2 pr-2" : "w-full"}>
          <Card className="border-t-4 border-t-primary">
            <CardHeader>
              <CardTitle>
                <View className="flex-row items-center">
                  <MapPin className="mr-2 text-primary" size={24} />
                  <Text className="text-xl font-bold">位置服务设置</Text>
                </View>
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* API Keys */}
              <Animated.View entering={FadeIn.delay(200)}>
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
                    onChangeText={(text) => setConfig({ iosLocationKey: text })}
                    placeholder="输入 iOS 定位 Key"
                  />
                </View>
              </Animated.View>

              {/* Location Settings */}
              <Animated.View entering={FadeIn.delay(400)}>
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
                        >
                          {option.label}
                        </Button>
                      ))}
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
                        toast.info("查看历史位置", {
                          description: "即将打开历史位置记录",
                          duration: 1500,
                        })
                      }
                    >
                      查看历史位置记录
                    </Button>
                  </View>
                </View>
              </Animated.View>

              {/* Advanced Settings */}
              <Animated.View entering={FadeIn.delay(600)}>
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

              {/* Action Buttons */}
              <View className="flex-row space-x-4">
                <Button
                  variant="default"
                  className="flex-1"
                  onPress={handleSaveSettings}
                >
                  <Settings size={18} className="mr-2" />
                  <Text>保存设置</Text>
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onPress={handleRefreshLocation}
                >
                  <RefreshCw size={18} className="mr-2" />
                  <Text>刷新位置</Text>
                </Button>
              </View>
            </CardContent>
          </Card>
        </View>

        <View className={isLandscape ? "w-1/2 pl-2" : "w-full mt-4"}>
          <LocationDialog />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default LocationSetting;
