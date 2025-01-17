import React from "react";
import { View, useWindowDimensions } from "react-native";
import { MapPin, Key, Globe2, RefreshCw } from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
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

  const handleRefreshLocation = () => {
    // 模拟刷新位置逻辑
    console.log("位置已刷新");
  };

  return (
    <Animated.View
      entering={FadeInDown.duration(200)}
      style={{ padding: 16, flexDirection: isLandscape ? "row" : "column" }}
    >
      <Card
        style={{
          flex: 1,
          marginRight: isLandscape ? 8 : 0,
          marginBottom: isLandscape ? 0 : 8,
        }}
      >
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

          <LocationDialog />

          <View>
            <Button
              onPress={handleRefreshLocation}
              className="mt-2 flex-row items-center"
            >
              <RefreshCw size={16} className="mr-1" />
              刷新位置
            </Button>
          </View>
        </CardContent>
      </Card>
    </Animated.View>
  );
};

export default LocationSetting;
