import { PropsWithChildren } from 'react';
import { StyleSheet, TouchableOpacity, LayoutAnimation } from 'react-native';
import Animated, { 
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolate,
  useSharedValue
} from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export function Collapsible({ children, title }: PropsWithChildren & { title: string }) {
  const isOpen = useSharedValue(0);
  const theme = useColorScheme() ?? 'light';

  const rotateAnimation = useAnimatedStyle(() => {
    return {
      transform: [
        {
          rotate: `${interpolate(isOpen.value, [0, 1], [0, 90])}deg`,
        },
      ],
    };
  });

  const contentAnimation = useAnimatedStyle(() => {
    return {
      maxHeight: withSpring(isOpen.value === 1 ? 1000 : 0),
      opacity: withTiming(isOpen.value, { duration: 200 }),
    };
  });

  const toggleCollapsible = () => {
    isOpen.value = isOpen.value === 0 ? 1 : 0;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  };

  return (
    <ThemedView>
      <TouchableOpacity
        style={styles.heading}
        onPress={toggleCollapsible}
        activeOpacity={0.8}>
        <Animated.View style={rotateAnimation}>
          <IconSymbol
            name="chevron.right"
            size={18}
            weight="medium"
            color={theme === 'light' ? Colors.light.icon : Colors.dark.icon}
          />
        </Animated.View>
        <ThemedText type="defaultSemiBold">{title}</ThemedText>
      </TouchableOpacity>
      
      <Animated.View style={[styles.content, contentAnimation]}>
        {children}
      </Animated.View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  content: {
    marginLeft: 24,
    overflow: 'hidden',
  },
});