import React from "react";
import { View } from "react-native";
import Animated, {
  FadeIn,
  withSpring,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  Scan,
  StopCircle,
  Loader2,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { toast } from "sonner-native";

const AnimatedButton = Animated.createAnimatedComponent(Button);

interface ScanButtonProps {
  isScanning: boolean;
  onPress: () => void;
  progress?: number;
  status?: "idle" | "scanning" | "success" | "error";
}

const ScanButton: React.FC<ScanButtonProps> = ({
  isScanning,
  onPress,
  progress = 0,
  status = "idle",
}) => {
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: withRepeat(
          withSpring(1.1, { damping: 2, stiffness: 80 }),
          -1,
          true
        ),
      },
    ],
  }));

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: withSequence(
          withTiming(-5, { duration: 50 }),
          withTiming(5, { duration: 50 }),
          withTiming(-5, { duration: 50 }),
          withTiming(5, { duration: 50 }),
          withTiming(0, { duration: 50 })
        ),
      },
    ],
  }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isScanning) {
      toast.info("正在停止扫描...");
    } else {
      toast.success("开始扫描...");
    }
    onPress();
  };

  const getButtonContent = () => {
    switch (status) {
      case "scanning":
        return (
          <View className="flex-row items-center space-x-2">
            <Loader2 className="animate-spin" size={20} />
            <Label className="text-lg font-bold">
              扫描中 {Math.round(progress * 100)}%
            </Label>
          </View>
        );
      case "success":
        return (
          <View className="flex-row items-center space-x-2">
            <CheckCircle2 size={20} className="text-green-500" />
            <Label className="text-lg font-bold">扫描完成</Label>
          </View>
        );
      case "error":
        return (
          <View className="flex-row items-center space-x-2">
            <AlertTriangle size={20} className="text-red-500" />
            <Label className="text-lg font-bold">扫描失败</Label>
          </View>
        );
      default:
        return (
          <Label className="text-lg font-bold">
            {isScanning ? `扫描中 ${Math.round(progress * 100)}%` : "开始扫描"}
          </Label>
        );
    }
  };

  return (
    <View className="items-center">
      <AnimatedButton
        entering={FadeIn.duration(500)}
        variant={
          status === "error"
            ? "destructive"
            : status === "success"
            ? "outline"
            : isScanning
            ? "secondary"
            : "default"
        }
        size="lg"
        onPress={handlePress}
        disabled={isScanning}
        style={[
          isScanning ? pulseStyle : undefined,
          status === "error" ? shakeStyle : undefined,
        ]}
      >
        {getButtonContent()}
      </AnimatedButton>
    </View>
  );
};

export default React.memo(ScanButton);
