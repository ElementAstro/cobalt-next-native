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
  FadeIn,
  FadeOut,
  SlideInUp,
  Layout,
  BounceIn,
} from "react-native-reanimated";
import { toast } from "sonner-native";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogClose,
} from "~/components/ui/dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "~/components/ui/alert";
import MapView, { Marker } from "react-native-maps";
import {
  init as initGeolocation,
  Geolocation,
  setNeedAddress,
  setLocatingWithReGeocode,
} from "react-native-amap-geolocation";
import { useLocationStore } from "~/stores/settings/useLocationStore";
import { Text } from "~/components/ui/text";

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

// 优化位置显示组件
const LocationDisplay = ({ location, error }: LocationDisplayProps) => {
  if (error) {
    return (
      <Animated.View entering={FadeIn.duration(300).springify()}>
        <Alert
          variant="destructive"
          icon={AlertTriangle}
          className="native:rounded-xl native:py-4"
        >
          <AlertTitle className="native:text-lg">定位错误</AlertTitle>
          <AlertDescription className="native:text-base">
            {error}
          </AlertDescription>
        </Alert>
      </Animated.View>
    );
  }

  if (!location) {
    return (
      <Animated.View entering={FadeIn.duration(300).springify()}>
        <Alert
          variant="default"
          icon={AlertTriangle}
          className="native:rounded-xl native:py-4"
        >
          <AlertTitle className="native:text-lg">未获取位置</AlertTitle>
          <AlertDescription className="native:text-base">
            点击下方按钮开始定位
          </AlertDescription>
        </Alert>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      entering={BounceIn.duration(500).springify()}
      className="space-y-2"
    >
      <Alert
        variant="default"
        icon={Target}
        className="native:rounded-xl native:py-4"
      >
        <AlertTitle className="native:text-lg">位置信息</AlertTitle>
        <AlertDescription className="native:text-base space-y-1">
          <Text>纬度: {location.latitude.toFixed(6)}</Text>
          <Text>经度: {location.longitude.toFixed(6)}</Text>
        </AlertDescription>
      </Alert>
    </Animated.View>
  );
};

// 修改 MapDisplay 组件参数类型
const MapDisplay = ({ location }: { location: LocationType | null }) => {
  if (!location) return null;

  // Web 平台显示替代内容
  if (Platform.OS === "web") {
    return (
      <Animated.View
        entering={SlideInUp.duration(500).springify()}
        className="flex-1 mt-4"
      >
        <Alert
          variant="default"
          icon={MapPin}
          className="native:rounded-xl native:py-4"
        >
          <AlertTitle className="native:text-lg">地图预览</AlertTitle>
          <AlertDescription className="native:text-base">
            地图功能仅在移动端可用
          </AlertDescription>
        </Alert>
      </Animated.View>
    );
  }

  // 动态导入地图组件，仅在native平台使用
  const MapViewComponent = Platform.select({
    native: () => require("react-native-maps").default,
    default: () => null,
  })();

  const MarkerComponent = Platform.select({
    native: () => require("react-native-maps").Marker,
    default: () => null,
  })();

  if (!MapViewComponent || !MarkerComponent) return null;

  return (
    <Animated.View
      entering={SlideInUp.duration(500).springify()}
      className="flex-1 mt-4 overflow-hidden rounded-xl native:rounded-2xl"
      style={{ minHeight: 200 }}
    >
      <MapViewComponent
        style={{ flex: 1 }}
        initialRegion={{
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        showsUserLocation={true}
      >
        <MarkerComponent
          coordinate={{
            latitude: location.latitude,
            longitude: location.longitude,
          }}
        />
      </MapViewComponent>
    </Animated.View>
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
        // 仅初始化高德定位
        await initGeolocation({
          ios: config.iosLocationKey,
          android: config.androidLocationKey,
        });

        // 开启逆地理信息
        if (Platform.OS === "android") {
          setNeedAddress(true);
        } else {
          setLocatingWithReGeocode(true);
        }
      } catch (error) {
        console.error("定位初始化失败:", error);
        toast.error("初始化失败", { description: "定位服务无法正常运行" });
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
        <Button
          variant="default"
          className="flex-row items-center space-x-2 native:h-12 native:rounded-xl"
        >
          <MapPin size={20} className="native:h-6 native:w-6" />
          <Text className="native:text-base">打开位置获取</Text>
        </Button>
      </DialogTrigger>

      <DialogContent className="p-0 native:rounded-3xl">
        <Animated.View
          style={[fadeAnim, slideAnim]}
          className="flex-1 p-4 native:p-5"
        >
          <Card className="native:rounded-2xl native:shadow-lg overflow-hidden">
            <CardHeader className="native:py-4">
              <CardTitle className="flex-row items-center space-x-2">
                <Target
                  size={24}
                  className="text-primary native:h-7 native:w-7"
                />
                <Text className="text-xl native:text-2xl font-bold">
                  当前位置
                </Text>
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              {loading ? (
                <Animated.View entering={FadeIn} className="items-center py-4">
                  <ActivityIndicator
                    size="large"
                    className="native:scale-150"
                  />
                  <Text className="mt-3 text-muted-foreground native:text-lg">
                    定位中...
                  </Text>
                </Animated.View>
              ) : (
                <LocationDisplay location={storeLocation} error={errorMsg} />
              )}

              <MapDisplay location={storeLocation} />
            </CardContent>

            <CardFooter className="native:pb-5">
              <Button
                variant="outline"
                onPress={getCurrentLocation}
                disabled={loading}
                className="w-full h-11 native:h-12 rounded-xl flex-row justify-center space-x-2"
              >
                <RefreshCw
                  size={18}
                  className={`native:h-5 native:w-5 ${
                    loading ? "animate-spin" : ""
                  }`}
                />
                <Text className="native:text-base">
                  {loading ? "定位中..." : "重新定位"}
                </Text>
              </Button>
            </CardFooter>
          </Card>
        </Animated.View>

        <DialogClose asChild>
          <Button
            variant="ghost"
            className="absolute top-2 right-2 p-2 native:p-3 rounded-full"
          >
            <XCircle size={20} className="native:h-6 native:w-6" />
          </Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
};

export default LocationDialog;
