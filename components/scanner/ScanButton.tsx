import React from "react";
import { View } from "react-native";
import Animated, { 
  FadeIn,
  withSpring,
  useAnimatedStyle,
  withRepeat
} from "react-native-reanimated";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const AnimatedButton = Animated.createAnimatedComponent(Button);

interface ScanButtonProps {
  isScanning: boolean;
  onPress: () => void;
  progress?: number;
}

const ScanButton: React.FC<ScanButtonProps> = ({ 
  isScanning, 
  onPress,
  progress = 0 
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

  return (
    <View className="items-center">
      <AnimatedButton
        entering={FadeIn.duration(500)}
        variant={isScanning ? "secondary" : "default"}
        size="lg"
        onPress={onPress}
        disabled={isScanning}
        style={isScanning ? pulseStyle : undefined}
      >
        <Label
          className={`${
            isScanning ? "text-secondary-foreground" : "text-primary-foreground"
          } text-lg font-bold`}
        >
          {isScanning ? `扫描中 ${Math.round(progress * 100)}%` : "开始扫描"}
        </Label>
      </AnimatedButton>
    </View>
  );
};

export default ScanButton;
