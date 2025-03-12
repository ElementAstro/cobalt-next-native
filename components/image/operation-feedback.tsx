import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Check, X, Loader2 } from 'lucide-react-native';
import { Text } from '~/components/ui/text';

interface Props {
  type: 'success' | 'error' | 'loading';
  message: string;
  visible: boolean;
  onHide: () => void;
}

export const OperationFeedback: React.FC<Props> = ({
  type,
  message,
  visible,
  onHide,
}) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(50);

  useEffect(() => {
    if (visible) {
      opacity.value = withSpring(1);
      translateY.value = withSpring(0);
      const timer = setTimeout(onHide, 2000);
      return () => clearTimeout(timer);
    } else {
      opacity.value = withTiming(0);
      translateY.value = withTiming(50);
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <Check className="text-success" />;
      case 'error':
        return <X className="text-destructive" />;
      case 'loading':
        return <Loader2 className="text-primary animate-spin" />;
    }
  };

  return (
    <Animated.View
      style={[animatedStyle]}
      className="absolute bottom-4 left-4 right-4 bg-background p-4 rounded-lg shadow-lg flex-row items-center space-x-3"
    >
      {getIcon()}
      <Text className="flex-1">{message}</Text>
    </Animated.View>
  );
};
