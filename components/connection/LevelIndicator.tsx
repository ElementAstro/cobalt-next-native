import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Dimensions,
  Animated,
  useColorScheme,
  TouchableOpacity,
  Alert,
} from "react-native";
import {
  Accelerometer,
  DeviceMotion,
  DeviceMotionMeasurement,
} from "expo-sensors";
import * as Haptics from "expo-haptics";
import { EventSubscription } from "expo-notifications";

const { width, height } = Dimensions.get("window");

const LevelIndicator: React.FC = () => {
  const [acceleration, setAcceleration] = useState({ x: 0, y: 0, z: 0 });
  const [deviceMotion, setDeviceMotion] =
    useState<DeviceMotionMeasurement | null>(null);
  const [isLevel, setIsLevel] = useState(true);
  const [angle, setAngle] = useState(0);
  const [subscription, setSubscription] = useState<EventSubscription | null>(
    null
  );
  const [motionSubscription, setMotionSubscription] =
    useState<EventSubscription | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isAvailable, setIsAvailable] = useState<boolean>(true);

  const levelIndicatorPosition = new Animated.ValueXY({
    x: width / 2,
    y: height / 2,
  });

  const colorScheme = useColorScheme();
  const textColor = colorScheme === "dark" ? "white" : "black";

  const requestPermission = async () => {
    try {
      const { status } = await Accelerometer.requestPermissionsAsync();
      const motionStatus = await DeviceMotion.requestPermissionsAsync();
      setHasPermission(
        status === "granted" && motionStatus.status === "granted"
      );
      if (status !== "granted" || motionStatus.status !== "granted") {
        Alert.alert("权限未授予", "请在设置中授予加速度计和设备运动权限。");
      }
    } catch (error) {
      console.error("请求权限失败:", error);
    }
  };

  const checkAvailability = async () => {
    const available = await Accelerometer.isAvailableAsync();
    const motionAvailable = await DeviceMotion.isAvailableAsync();
    setIsAvailable(available && motionAvailable);
    if (!available || !motionAvailable) {
      Alert.alert("传感器不可用", "您的设备不支持加速度计或设备运动传感器。");
    }
  };

  const _subscribe = () => {
    const sub = Accelerometer.addListener((data) => {
      setAcceleration(data);

      const angleInDegrees = Math.atan2(data.y, data.x) * (180 / Math.PI);
      setAngle(Math.abs(angleInDegrees));

      if (Math.abs(data.x) < 0.1 && Math.abs(data.y) < 0.1) {
        setIsLevel(true);
      } else {
        setIsLevel(false);
      }

      Animated.spring(levelIndicatorPosition, {
        toValue: {
          x: width / 2 + data.x * width * 0.4,
          y: height / 2 + data.y * height * 0.2,
        },
        useNativeDriver: true,
        friction: 5,
        tension: 40,
      }).start();

      if (Math.abs(data.x) > 0.5 || Math.abs(data.y) > 0.5) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
    });
    setSubscription(sub);
  };

  const _subscribeMotion = () => {
    const sub = DeviceMotion.addListener((data) => {
      setDeviceMotion(data);
      // 可以根据设备运动数据进行更多处理
    });
    setMotionSubscription(sub);
  };

  const _unsubscribe = () => {
    subscription && subscription.remove();
    setSubscription(null);
  };

  const _unsubscribeMotion = () => {
    motionSubscription && motionSubscription.remove();
    setMotionSubscription(null);
  };

  useEffect(() => {
    (async () => {
      await checkAvailability();
      if (isAvailable) {
        await requestPermission();
      }
    })();
  }, [isAvailable]);

  useEffect(() => {
    if (hasPermission && isAvailable) {
      _subscribe();
      _subscribeMotion();
      Accelerometer.setUpdateInterval(100);
      DeviceMotion.setUpdateInterval(100);
    }
    return () => {
      _unsubscribe();
      _unsubscribeMotion();
    };
  }, [
    _subscribe,
    _unsubscribe,
    _unsubscribeMotion,
    hasPermission,
    isAvailable,
  ]);

  const getIndicatorColor = (angle: number) => {
    if (angle < 5) return "green";
    if (angle < 15) return "yellow";
    return "red";
  };

  const handleRetry = () => {
    checkAvailability();
    if (isAvailable) {
      requestPermission();
    }
  };

  return (
    <View
      className={`flex-1 justify-center items-center p-5 ${
        colorScheme === "dark" ? "bg-black" : "bg-white"
      }`}
    >
      {hasPermission === null ? (
        <Text className={`text-center text-lg ${textColor}`}>
          正在请求权限...
        </Text>
      ) : !hasPermission ? (
        <View className="justify-center items-center">
          <Text className={`text-center text-lg ${textColor}`}>
            加速度计或设备运动权限被拒绝。
          </Text>
          <TouchableOpacity
            className="mt-3 py-2 px-5 bg-blue-500 rounded"
            onPress={handleRetry}
          >
            <Text className="text-white text-lg">重试</Text>
          </TouchableOpacity>
        </View>
      ) : !isAvailable ? (
        <View className="justify-center items-center">
          <Text className={`text-center text-lg ${textColor}`}>
            设备不支持加速度计或设备运动传感器。
          </Text>
          <TouchableOpacity
            className="mt-3 py-2 px-5 bg-blue-500 rounded"
            onPress={handleRetry}
          >
            <Text className="text-white text-lg">重试</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View className="relative w-3/4 h-1/2 border-4 border-gray-500 rounded-full justify-center items-center">
            <Animated.View
              className={`absolute w-12 h-12 rounded-full`}
              style={{
                backgroundColor: getIndicatorColor(angle),
                transform: [
                  { translateX: levelIndicatorPosition.x },
                  { translateY: levelIndicatorPosition.y },
                  { rotate: `${angle}deg` },
                ],
              }}
            />
            <Text className={`absolute text-xl font-bold ${textColor}`}>
              {angle.toFixed(1)}°
            </Text>
          </View>

          <Text className={`mt-4 text-2xl font-bold ${textColor}`}>
            {isLevel ? "水平" : "不水平"}
          </Text>

          <Text className={`mt-2 text-lg font-medium ${textColor}`}>
            {angle.toFixed(1)}° 偏离水平
          </Text>

          {!isLevel && (
            <Text className="mt-2 text-lg font-medium text-red-500">
              请调整设备
            </Text>
          )}

          {deviceMotion && (
            <View className="mt-5 items-center">
              <Text className={`text-base ${textColor}`}>
                Orientation: {deviceMotion.orientation}
              </Text>
              <Text className={`text-base ${textColor}`}>
                Rotation Rate - Alpha: {deviceMotion.rotation?.alpha.toFixed(2)}
                ° , Beta: {deviceMotion.rotation?.beta.toFixed(2)}° , Gamma:{" "}
                {deviceMotion.rotation?.gamma.toFixed(2)}°
              </Text>
            </View>
          )}
        </>
      )}
    </View>
  );
};

export default LevelIndicator;
