import React, { useState, useEffect, useCallback, useMemo } from "react";
import { View, useColorScheme, useWindowDimensions } from "react-native";
import {
  Accelerometer,
  DeviceMotion,
  DeviceMotionMeasurement,
} from "expo-sensors";
import * as Haptics from "expo-haptics";
import { z } from "zod";
import { toast } from "sonner-native";
import {
  Compass,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Ruler,
  RotateCcw,
  Settings,
} from "lucide-react-native";
import Animated, {
  FadeIn,
  SlideInRight,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";
import { Alert, AlertTitle, AlertDescription } from "../ui/alert";
import { Text } from "../ui/text";
import { EventSubscription } from "expo-notifications";

// Props 接口
interface LevelDisplayProps {
  angle: number;
  isLevel: boolean;
}

// Validation Schema
const AccelerationSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});

const MotionSchema = z.object({
  rotation: z.object({
    alpha: z.number(),
    beta: z.number(),
    gamma: z.number(),
    timestamp: z.number(),
  }),
  orientation: z.number(),
});

// Components
const LevelDisplay = React.memo(({ angle, isLevel }: LevelDisplayProps) => {
  const colorScheme = useColorScheme();
  const dynamicTextColor = colorScheme === "dark" ? "white" : "black";

  return (
    <View className="items-center space-y-4">
      <Text className={`text-2xl font-bold ${dynamicTextColor}`}>
        {isLevel ? "水平" : "不水平"}
      </Text>
      <Text className={`text-lg font-medium ${dynamicTextColor}`}>
        {angle.toFixed(1)}° 偏离水平
      </Text>
    </View>
  );
});

const LevelIndicator = () => {
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

  const { width, height } = useWindowDimensions();
  const levelIndicatorX = useSharedValue(width / 2);
  const levelIndicatorY = useSharedValue(height / 2);

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
        toast.error("权限未授予", {
          description: "请在设置中授予加速度计和设备运动权限",
        });
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
      toast.error("传感器不可用", {
        description: "您的设备不支持加速度计或设备运动传感器",
      });
    }
  };

  const handleMotionUpdate = useCallback((data: DeviceMotionMeasurement) => {
    try {
      const validatedMotion = MotionSchema.parse(data);
      setDeviceMotion({
        ...validatedMotion,
        acceleration: data.acceleration,
        accelerationIncludingGravity: data.accelerationIncludingGravity,
        rotationRate: data.rotationRate,
        interval: data.interval,
        rotation: {
          ...validatedMotion.rotation,
        },
      });
    } catch (error) {
      toast.error("传感器数据无效", {
        description: "请检查设备传感器状态",
        icon: <AlertTriangle size={20} />,
      });
    }
  }, []);

  const handleAccelerationUpdate = useCallback(
    (data: { x: number; y: number; z: number } | undefined) => {
      if (!data || data.y === undefined) {
        toast.error("传感器数据为空", {
          description: "请检查设备传感器状态",
          icon: <AlertTriangle size={20} />,
        });
        return;
      }

      try {
        const validatedData = AccelerationSchema.parse(data);

        const angleInDegrees =
          Math.atan2(validatedData.y, validatedData.x) * (180 / Math.PI);
        setAngle(Math.abs(angleInDegrees));

        if (
          Math.abs(validatedData.x) < 0.1 &&
          Math.abs(validatedData.y) < 0.1
        ) {
          setIsLevel(true);
          toast.success("设备已水平", {
            icon: <CheckCircle2 size={20} />,
          });
        } else {
          setIsLevel(false);
        }

        if (
          Math.abs(validatedData.x) > 0.5 ||
          Math.abs(validatedData.y) > 0.5
        ) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }
      } catch (error) {
        toast.error("加速度数据无效", {
          description: "请检查设备传感器状态",
          icon: <AlertTriangle size={20} />,
        });
      }
    },
    []
  );

  const _subscribe = useCallback(() => {
    const sub = Accelerometer.addListener(handleAccelerationUpdate);
    setSubscription(sub);
  }, [handleAccelerationUpdate]);

  const _subscribeMotion = useCallback(() => {
    const sub = DeviceMotion.addListener(handleMotionUpdate);
    setMotionSubscription(sub);
  }, [handleMotionUpdate]);

  const _unsubscribe = useCallback(() => {
    subscription && subscription.remove();
    setSubscription(null);
  }, [subscription]);

  const _unsubscribeMotion = useCallback(() => {
    motionSubscription && motionSubscription.remove();
    setMotionSubscription(null);
  }, [motionSubscription]);

  useEffect(() => {
    (async () => {
      await checkAvailability();
      if (isAvailable) {
        await requestPermission();
      }
    })();
  }, []);

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

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: withSpring(levelIndicatorX.value) },
      { translateY: withSpring(levelIndicatorY.value) },
      { rotate: `${angle}deg` },
    ],
  }));

  return (
    <Animated.View entering={FadeIn} className="flex-1 p-4">
      {hasPermission === null ? (
        <Alert variant="default" icon={Settings}>
          <AlertTitle>正在请求权限</AlertTitle>
          <AlertDescription>请稍候...</AlertDescription>
        </Alert>
      ) : !hasPermission || !isAvailable ? (
        <View className="space-y-4">
          <Alert variant="destructive" icon={AlertTriangle}>
            <AlertTitle>
              {!hasPermission ? "权限被拒绝" : "传感器不可用"}
            </AlertTitle>
            <AlertDescription>
              {!hasPermission
                ? "请允许访问设备传感器"
                : "您的设备不支持所需传感器"}
            </AlertDescription>
          </Alert>
          <Button onPress={handleRetry} className="w-full">
            <RotateCcw size={20} className="mr-2" />
            <Text>重试</Text>
          </Button>
        </View>
      ) : (
        <View className="space-y-8">
          <View className="relative w-full aspect-square border-4 border-gray-500 rounded-full items-center justify-center">
            <Animated.View
              className="absolute w-12 h-12 rounded-full"
              style={[
                indicatorStyle,
                {
                  backgroundColor: getIndicatorColor(angle),
                },
              ]}
            />
            <Compass size={32} className="text-primary" />
            <Text className="absolute text-xl font-bold">
              {angle.toFixed(1)}°
            </Text>
          </View>

          <LevelDisplay angle={angle} isLevel={isLevel} />

          <Progress
            value={Math.min(((90 - angle) / 90) * 100, 100)}
            className="h-2"
          />

          {deviceMotion && (
            <Alert variant="default" icon={Ruler}>
              <AlertTitle>设备姿态</AlertTitle>
              <AlertDescription>
                Alpha: {deviceMotion.rotation.alpha.toFixed(2)}°{"\n"}
                Beta: {deviceMotion.rotation.beta.toFixed(2)}°{"\n"}
                Gamma: {deviceMotion.rotation.gamma.toFixed(2)}°
              </AlertDescription>
            </Alert>
          )}
        </View>
      )}
    </Animated.View>
  );
};

export default LevelIndicator;
