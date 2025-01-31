import React, { useState, useEffect, useCallback } from "react";
import {
  ActivityIndicator,
  useWindowDimensions,
  Platform,
  PermissionsAndroid,
  View,
} from "react-native";
import * as Location from "expo-location";
import {
  MapPin,
  RefreshCw,
  XCircle,
  Target,
  AlertTriangle,
} from "lucide-react-native";
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
  useSharedValue,
  interpolate,
} from "react-native-reanimated";
import { toast } from "sonner-native";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AMapSdk, MapView, Marker } from "react-native-amap3d";
import {
  init as initGeolocation,
  Geolocation,
  setNeedAddress,
  setLocatingWithReGeocode,
} from "react-native-amap-geolocation";
import { useLocationStore } from "@/stores/useLocationStore";
import { Text } from "@/components/ui/text";

// 类型定义
interface LocationType {
  latitude: number;
  longitude: number;
  timestamp: number;
}

interface LocationDisplayProps {
  location: LocationType | null;
  error: string | null;
}

interface MapDisplayProps {
  location: LocationType | null;
  isLandscape: boolean;
}

interface GeolocationPosition {
  coords: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    altitude?: number | null;
    heading?: number | null;
    speed?: number | null;
  };
  timestamp: number;
}

// 位置显示组件
const LocationDisplay = ({ location, error }: LocationDisplayProps) => {
  if (error) {
    return (
      <Alert variant="destructive" icon={AlertTriangle}>
        <AlertTitle>定位错误</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!location) {
    return (
      <Alert variant="default" icon={AlertTriangle}>
        <AlertTitle>未获取位置</AlertTitle>
        <AlertDescription>点击下方按钮开始定位</AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert variant="default" icon={Target}>
      <AlertTitle>位置信息</AlertTitle>
      <AlertDescription>
        纬度: {location.latitude.toFixed(6)}
        经度: {location.longitude.toFixed(6)}
      </AlertDescription>
    </Alert>
  );
};

// 地图显示组件
const MapDisplay = ({ location, isLandscape }: MapDisplayProps) => {
  if (!location) return null;

  return (
    <View className={`flex-1 ${isLandscape ? "ml-4" : "mt-4"}`}>
      <MapView
        style={{ flex: 1, borderRadius: 8 }}
        initialCameraPosition={{
          target: {
            latitude: location.latitude,
            longitude: location.longitude,
          },
          zoom: 15,
        }}
        myLocationEnabled={true}
        onPress={(event) => {
          console.log("Map pressed at:", event.nativeEvent);
        }}
        onLoad={() => {
          console.log("Map loaded");
        }}
      >
        <Marker
          position={{
            latitude: location.latitude,
            longitude: location.longitude,
          }}
        />
      </MapView>
    </View>
  );
};

// 位置数据验证Schema
const LocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timestamp: z.number(),
});

const LocationDialog: React.FC = () => {
  const { config, location: storeLocation, setLocation } = useLocationStore();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  // 修改动画初始化
  const animations = {
    scale: useSharedValue(1),
    rotate: useSharedValue(0),
    progress: useSharedValue(1), // 将初始值改为 1
  };

  // 优化动画样式
  const fadeAnim = useAnimatedStyle(() => ({
    opacity: withSpring(animations.progress.value),
  }));

  const slideAnim = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: withSpring(
          interpolate(animations.progress.value, [0, 1], [50, 0])
        ),
      },
      { scale: withSpring(animations.scale.value) },
      {
        rotate: withSpring(
          `${interpolate(animations.rotate.value, [0, 360], [0, 360])}deg`
        ),
      },
    ],
  }));

  // 初始化高德地图与定位
  useEffect(() => {
    const initializeMap = async () => {
      try {
        // 初始化高德地图
        await AMapSdk.init(
          Platform.select({
            android: config.androidMapKey, // 替换成你的 Android 地图 App Key
            ios: config.iosMapKey, // 替换成你的 iOS 地图 App Key
          })
        );

        // 初始化高德定位
        await initGeolocation({
          ios: config.iosLocationKey, // 替换成你的 iOS 定位 App Key
          android: config.androidLocationKey, // 替换成你的 Android 定位 App Key
        });

        // 开启逆地理信息
        if (Platform.OS === "android") {
          setNeedAddress(true);
        } else {
          setLocatingWithReGeocode(true);
        }
      } catch (error) {
        console.error("地图初始化失败:", error);
        toast.error("初始化失败", { description: "地图服务无法正常运行" });
      }
    };

    initializeMap();
  }, [config]);

  // 请求权限
  const requestLocationPermissions = async (): Promise<boolean> => {
    if (Platform.OS === "android") {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      ]);
      if (
        granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] !==
          PermissionsAndroid.RESULTS.GRANTED ||
        granted[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] !==
          PermissionsAndroid.RESULTS.GRANTED
      ) {
        setErrorMsg("权限被拒绝：无法访问位置信息");
        return false;
      }
      return true;
    } else {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("权限被拒绝：无法访问位置信息");
        return false;
      }
      return true;
    }
  };

  // 获取位置信息并验证
  const getCurrentLocation = useCallback(async () => {
    setLoading(true);
    animations.scale.value = withSpring(0.9);
    animations.progress.value = withSpring(0.8);

    try {
      const permissionGranted = await requestLocationPermissions();
      if (!permissionGranted) {
        toast.error("权限错误", { description: "无法访问位置信息" });
        return;
      }

      const position: GeolocationPosition = await new Promise(
        (resolve, reject) => {
          Geolocation.getCurrentPosition(
            (pos: GeolocationPosition) => resolve(pos),
            reject
          );
        }
      );

      const locationData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        timestamp: Date.now(),
      };

      const validatedLocation = LocationSchema.parse(locationData);
      setLocation(validatedLocation);

      animations.scale.value = withSpring(1);
      animations.rotate.value = withTiming(360, { duration: 1000 });
      animations.progress.value = withSpring(1);

      toast.success("定位成功", { description: "已获取最新位置" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "未知错误";
      toast.error("定位失败", { description: message });
      setErrorMsg(message);
    } finally {
      setLoading(false);
      // 确保动画回到初始状态
      animations.scale.value = withSpring(1);
      animations.progress.value = withSpring(1);
    }
  }, [setLocation, animations]);

  // 启动持续定位
  useEffect(() => {
    if (config.autoLocate) {
      getCurrentLocation();

      // 监听定位更新
      const watchId = Geolocation.watchPosition((loc) => {
        setLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          timestamp: Date.now(),
        });
      });

      return () => {
        // 停止连续定位
        if (watchId) {
          Geolocation.clearWatch(watchId);
        }
      };
    }
  }, [getCurrentLocation, config.autoLocate, setLocation]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="default" className="flex-row items-center space-x-2">
          <MapPin size={20} />
          <Text>打开位置获取</Text>
        </Button>
      </DialogTrigger>

      <DialogContent className="p-0">
        <Animated.View
          style={[fadeAnim, slideAnim]}
          className="flex flex-col lg:flex-row p-4"
        >
          {/* 位置信息卡片 */}
          <Card className="flex-1 lg:mr-4">
            <CardHeader>
              <CardTitle className="flex-row items-center space-x-2">
                <Target size={24} className="text-primary" />
                <Text className="text-xl font-bold">当前位置</Text>
              </CardTitle>
            </CardHeader>

            <CardContent>
              {loading ? (
                <View className="items-center">
                  <ActivityIndicator size="large" />
                  <Text className="mt-2 text-muted-foreground">定位中...</Text>
                </View>
              ) : (
                <LocationDisplay location={storeLocation} error={errorMsg} />
              )}
            </CardContent>

            <CardFooter>
              <Button
                variant="outline"
                onPress={getCurrentLocation}
                disabled={loading}
                className="w-full flex-row justify-center space-x-2"
              >
                <RefreshCw
                  size={18}
                  className={loading ? "animate-spin" : ""}
                />
                <Text>{loading ? "定位中..." : "重新定位"}</Text>
              </Button>
            </CardFooter>
          </Card>

          {/* 地图显示 */}
          <View className="flex-1 mt-4 lg:mt-0">
            <MapDisplay location={storeLocation} isLandscape={isLandscape} />
          </View>
        </Animated.View>

        <DialogClose asChild>
          <Button variant="ghost" className="absolute top-2 right-2">
            <XCircle size={20} />
          </Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
};

export default LocationDialog;
