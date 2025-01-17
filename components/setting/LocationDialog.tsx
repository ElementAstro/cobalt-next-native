import React, { useState, useEffect, useCallback } from "react";
import {
  ActivityIndicator,
  useWindowDimensions,
  Platform,
  PermissionsAndroid,
  View,
  Text,
} from "react-native";
import * as Location from "expo-location";
import {
  MapPin,
  RefreshCw,
  XCircle,
  Target,
  Map,
  AlertTriangle,
  History,
} from "lucide-react-native";
import Animated, {
  useAnimatedStyle
} from "react-native-reanimated";
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
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AMapSdk, MapView, Marker, MapType } from "react-native-amap3d";
import {
  init as initGeolocation,
  Geolocation,
  setNeedAddress,
  setLocatingWithReGeocode,
} from "react-native-amap-geolocation";
import { useLocationStore } from '@/stores/useLocationStore';

const LocationDialog: React.FC = () => {
  const { config, location: storeLocation, setLocation } = useLocationStore();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const fadeAnim = useAnimatedStyle(() => ({
    opacity: 1,
  }));
  const slideAnim = useAnimatedStyle(() => ({
    transform: [{ translateY: 0 }],
  }));

  // 初始化高德地图与定位
  useEffect(() => {
    // 初始化高德地图
    AMapSdk.init(
      Platform.select({
        android: config.androidMapKey, // 替换成你的 Android 地图 App Key
        ios: config.iosMapKey, // 替换成你的 iOS 地图 App Key
      })
    );

    // 初始化高德定位
    initGeolocation({
      ios: config.iosLocationKey, // 替换成你的 iOS 定位 App Key
      android: config.androidLocationKey, // 替换成你的 Android 定位 App Key
    });

    // 开启逆地理信息
    if (Platform.OS === "android") {
      setNeedAddress(true);
    } else {
      setLocatingWithReGeocode(true);
    }
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

  // 获取当前定位
  const getCurrentLocation = useCallback(async () => {
    setLoading(true);
    const permissionGranted = await requestLocationPermissions();
    if (!permissionGranted) {
      setLoading(false);
      return;
    }

    try {
      await new Promise((resolve, reject) => {
        Geolocation.getCurrentPosition(
          (position) => {
            setLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              timestamp: Date.now(),
            });
            setErrorMsg(null);
            resolve(position);
          },
          (error) => {
            setErrorMsg("获取位置失败: " + error.message);
            reject(error);
          }
        );
      });
    } catch (error) {
      setErrorMsg("获取位置失败: " + (error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [setLocation]);

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
        <Button variant="default" size="default">
          <MapPin size={20} className="mr-2" />
          打开位置获取
        </Button>
      </DialogTrigger>
      <DialogContent>
        <Animated.View
          className={`w-full ${
            isLandscape ? "flex-row" : "flex-col"
          } space-y-4`}
          style={[fadeAnim, slideAnim]}
        >
          {/* 左侧卡片：显示定位信息 */}
          <Card className={`flex-1 ${isLandscape ? "mr-4" : ""}`}>
            <CardHeader>
              <CardTitle className="flex-row items-center">
                <Map size={24} className="mr-2 text-blue-500" />
                当前位置
              </CardTitle>
              <CardContent>
                {loading ? (
                  <ActivityIndicator size="small" color="#3b82f6" />
                ) : errorMsg ? (
                  <Label className="text-red-500 flex-row items-center">
                    <AlertTriangle size={16} className="mr-1" />
                    {errorMsg}
                  </Label>
                ) : storeLocation ? (
                  <Label className="flex-row items-center">
                    <Target size={16} className="mr-1 text-green-500" />
                    纬度: {storeLocation.latitude.toFixed(4)}, 经度:{" "}
                    {storeLocation.longitude.toFixed(4)}
                  </Label>
                ) : (
                  <Label className="text-gray-500">未获取位置</Label>
                )}
              </CardContent>
            </CardHeader>
            <CardFooter>
              <Button
                variant="outline"
                onPress={getCurrentLocation}
                className="flex-row items-center"
              >
                <RefreshCw size={16} className="mr-1" />
                重新定位
              </Button>
            </CardFooter>
          </Card>

          {/* 右侧视图：地图显示 */}
          <Card className={`flex-1 ${isLandscape ? "ml-4" : ""}`}>
            <CardHeader>
              <CardTitle className="flex-row items-center">
                <History size={24} className="mr-2 text-green-500" />
                地图定位
              </CardTitle>
            </CardHeader>
            <CardContent>
              <View className={`${isLandscape ? "h-64" : "h-48"} w-full`}>
                <MapView
                  mapType={MapType.Standard}
                  initialCameraPosition={{
                    target: {
                      latitude: storeLocation?.latitude || 39.91095,
                      longitude: storeLocation?.longitude || 116.37296,
                    },
                    zoom: 14,
                  }}
                  className="w-full h-full"
                >
                  {storeLocation && (
                    <Marker
                      position={{
                        latitude: storeLocation.latitude,
                        longitude: storeLocation.longitude,
                      }}
                    >
                      <Text
                        style={{
                          color: "#fff",
                          backgroundColor: "#f87171",
                          padding: 4,
                          borderRadius: 4,
                          textAlign: "center",
                        }}
                      >
                        当前位置
                      </Text>
                    </Marker>
                  )}
                </MapView>
              </View>
            </CardContent>
          </Card>
        </Animated.View>

        <DialogClose asChild>
          <Button
            variant="ghost"
            size="default"
            className="flex-row items-center mt-4"
          >
            <XCircle size={20} className="mr-2" />
            关闭
          </Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
};

export default LocationDialog;
