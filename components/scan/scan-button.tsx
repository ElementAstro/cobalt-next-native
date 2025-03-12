import React, { useEffect } from "react";
import { View, Pressable } from "react-native";
import Animated, {
  FadeIn,
  withSpring,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  interpolateColor,
  useSharedValue,
} from "react-native-reanimated";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  Scan,
  StopCircle,
  Loader2,
  ZapOff,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { toast } from "sonner-native";
import { type ScanStatus } from "~/stores/useScannerStore";

const AnimatedButton = Animated.createAnimatedComponent(Button);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ScanButtonProps {
  isScanning: boolean;
  onPress: () => void;
  progress?: number;
  status?: ScanStatus;
  disabled?: boolean;
}

const ScanButton: React.FC<ScanButtonProps> = ({
  isScanning,
  onPress,
  progress = 0,
  status = "idle",
  disabled = false,
}) => {
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const glowOpacity = useSharedValue(0);

  // 脉冲动画
  useEffect(() => {
    if (isScanning) {
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1000 }),
          withTiming(0.5, { duration: 1000 })
        ),
        -1,
        true
      );
    } else {
      glowOpacity.value = withTiming(0);
    }
  }, [isScanning]);

  const buttonStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      glowOpacity.value,
      [0, 1],
      [
        "hsl(var(--primary))",
        status === "error" ? "hsl(var(--destructive))" : "hsl(var(--primary))",
      ]
    );

    return {
      transform: [{ scale: scale.value }],
      backgroundColor,
    };
  });

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [
      {
        scale: withSpring(isScanning ? 1.2 : 1, {
          mass: 1,
          damping: 15,
        }),
      },
    ],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      {
        rotate: `${rotation.value * 360}deg`,
      },
    ],
  }));

  const handlePress = async () => {
    scale.value = withSequence(
      withTiming(0.95, { duration: 100 }),
      withTiming(1, { duration: 100 })
    );

    if (status === "error") {
      rotation.value = withSequence(
        withTiming(rotation.value - 0.1, { duration: 100 }),
        withTiming(rotation.value, { duration: 100 })
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else {
      Haptics.impactAsync(
        isScanning
          ? Haptics.ImpactFeedbackStyle.Heavy
          : Haptics.ImpactFeedbackStyle.Medium
      );
    }

    if (isScanning) {
      toast.info("正在停止扫描...", {
        icon: "⏹️",
        duration: 2000,
      });
    } else {
      toast.success("开始扫描...", {
        icon: "🔍",
        duration: 2000,
      });
    }

    onPress();
  };

  const getButtonContent = () => {
    const iconProps = {
      size: 24,
      className: "text-white",
    };

    switch (status) {
      case "scanning":
        return (
          <View className="flex-row items-center justify-center space-x-3">
            <Animated.View style={iconStyle}>
              <Loader2 {...iconProps} className="animate-spin" />
            </Animated.View>
            <Label className="text-lg font-bold text-white">
              扫描中 {Math.round(progress * 100)}%
            </Label>
          </View>
        );
      case "success":
        return (
          <View className="flex-row items-center justify-center space-x-3">
            <CheckCircle2 {...iconProps} />
            <Label className="text-lg font-bold text-white">扫描完成</Label>
          </View>
        );
      case "error":
        return (
          <View className="flex-row items-center justify-center space-x-3">
            <AlertTriangle {...iconProps} />
            <Label className="text-lg font-bold text-white">扫描失败</Label>
          </View>
        );
      default:
        return (
          <View className="flex-row items-center justify-center space-x-3">
            {isScanning ? (
              <>
                <StopCircle {...iconProps} />
                <Label className="text-lg font-bold text-white">
                  停止扫描 ({Math.round(progress * 100)}%)
                </Label>
              </>
            ) : (
              <>
                <Scan {...iconProps} />
                <Label className="text-lg font-bold text-white">开始扫描</Label>
              </>
            )}
          </View>
        );
    }
  };

  if (disabled) {
    return (
      <View className="items-center px-4 py-3 opacity-50">
        <View className="w-full bg-muted/30 rounded-full p-4 flex-row items-center justify-center space-x-2">
          <ZapOff size={24} className="text-muted-foreground" />
          <Label className="text-lg font-medium text-muted-foreground">
            扫描已禁用
          </Label>
        </View>
      </View>
    );
  }

  return (
    <View className="items-center px-4 py-3">
      {/* 发光效果层 */}
      <Animated.View
        style={glowStyle}
        className="absolute inset-0 bg-primary/20 rounded-full blur-xl"
      />

      <AnimatedPressable
        onPress={handlePress}
        disabled={disabled}
        className="w-full"
      >
        <AnimatedButton
          entering={FadeIn.duration(500).springify()}
          variant={
            status === "error"
              ? "destructive"
              : status === "success"
              ? "default"
              : isScanning
              ? "secondary"
              : "default"
          }
          size="lg"
          style={[
            buttonStyle,
            {
              height: 60,
            },
          ]}
          className={`
            w-full 
            rounded-full
            shadow-lg
            overflow-hidden
            bg-gradient-to-r
            ${
              status === "error"
                ? "from-destructive to-destructive/80"
                : "from-primary to-primary/80"
            }
            ${disabled ? "opacity-50" : ""}
          `}
        >
          {getButtonContent()}
        </AnimatedButton>
      </AnimatedPressable>
    </View>
  );
};

export default React.memo(ScanButton);
