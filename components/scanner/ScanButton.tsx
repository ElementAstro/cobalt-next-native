import React from "react";
import Animated, { FadeIn } from "react-native-reanimated";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const AnimatedButton = Animated.createAnimatedComponent(Button);

interface ScanButtonProps {
  isScanning: boolean;
  onPress: () => void;
}

const ScanButton: React.FC<ScanButtonProps> = ({ isScanning, onPress }) => {
  return (
    <AnimatedButton
      entering={FadeIn.duration(500)}
      variant={isScanning ? "secondary" : "default"}
      size="lg"
      onPress={onPress}
      disabled={isScanning}
    >
      <Label
        className={`${
          isScanning ? "text-secondary-foreground" : "text-primary-foreground"
        } text-lg font-bold`}
      >
        {isScanning ? "扫描中..." : "开始扫描"}
      </Label>
    </AnimatedButton>
  );
};

export default ScanButton;
