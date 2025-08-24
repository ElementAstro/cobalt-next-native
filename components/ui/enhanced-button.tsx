import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { Pressable, ActivityIndicator, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSpring,
  runOnJS 
} from 'react-native-reanimated';
import { TextClassContext } from '~/components/ui/text';
import { cn } from '~/lib/utils';

const enhancedButtonVariants = cva(
  'group flex items-center justify-center rounded-md web:ring-offset-background web:transition-colors web:focus-visible:outline-none web:focus-visible:ring-2 web:focus-visible:ring-ring web:focus-visible:ring-offset-2',
  {
    variants: {
      variant: {
        primary: 'bg-primary web:hover:opacity-90 active:opacity-90',
        secondary: 'bg-secondary web:hover:opacity-80 active:opacity-80',
        destructive: 'bg-destructive web:hover:opacity-90 active:opacity-90',
        outline: 'border border-input bg-background web:hover:bg-accent web:hover:text-accent-foreground active:bg-accent',
        ghost: 'web:hover:bg-accent web:hover:text-accent-foreground active:bg-accent',
        link: 'web:underline-offset-4 web:hover:underline web:focus:underline',
      },
      size: {
        sm: 'h-9 rounded-md px-3',
        md: 'h-10 px-4 py-2 native:h-12 native:px-5 native:py-3',
        lg: 'h-11 rounded-md px-8 native:h-14',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

const enhancedButtonTextVariants = cva(
  'web:whitespace-nowrap text-sm native:text-base font-medium text-foreground web:transition-colors',
  {
    variants: {
      variant: {
        primary: 'text-primary-foreground',
        secondary: 'text-secondary-foreground group-active:text-secondary-foreground',
        destructive: 'text-destructive-foreground',
        outline: 'group-active:text-accent-foreground',
        ghost: 'group-active:text-accent-foreground',
        link: 'text-primary group-active:underline',
      },
      size: {
        sm: '',
        md: '',
        lg: 'native:text-lg',
        icon: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

interface EnhancedButtonProps extends React.ComponentPropsWithoutRef<typeof Pressable>, VariantProps<typeof enhancedButtonVariants> {
  isLoading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  hapticFeedback?: boolean;
  animationType?: 'scale' | 'opacity' | 'none';
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const EnhancedButton = React.forwardRef<React.ElementRef<typeof Pressable>, EnhancedButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    isLoading = false,
    loadingText,
    leftIcon,
    rightIcon,
    hapticFeedback = false,
    animationType = 'scale',
    children,
    onPress,
    disabled,
    ...props 
  }, ref) => {
    const scale = useSharedValue(1);
    const opacity = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => {
      if (animationType === 'scale') {
        return {
          transform: [{ scale: scale.value }],
        };
      } else if (animationType === 'opacity') {
        return {
          opacity: opacity.value,
        };
      }
      return {};
    });

    const handlePressIn = () => {
      if (animationType === 'scale') {
        scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
      } else if (animationType === 'opacity') {
        opacity.value = withTiming(0.7, { duration: 100 });
      }
    };

    const handlePressOut = () => {
      if (animationType === 'scale') {
        scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      } else if (animationType === 'opacity') {
        opacity.value = withTiming(1, { duration: 100 });
      }
    };

    const handlePress = (event: any) => {
      if (isLoading || disabled) return;
      
      if (hapticFeedback) {
        runOnJS(() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        })();
      }
      
      onPress?.(event);
    };

    const isDisabled = disabled || isLoading;

    return (
      <TextClassContext.Provider
        value={cn(
          isDisabled && 'web:pointer-events-none',
          enhancedButtonTextVariants({ variant, size })
        )}
      >
        <AnimatedPressable
          className={cn(
            isDisabled && 'opacity-50 web:pointer-events-none',
            enhancedButtonVariants({ variant, size, className })
          )}
          ref={ref}
          role='button'
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={isDisabled}
          accessibilityState={{ disabled: isDisabled, busy: isLoading }}
          style={animatedStyle}
          {...props}
        >
          <View className="flex-row items-center justify-center">
            {isLoading && (
              <ActivityIndicator 
                size="small" 
                color={variant === 'primary' ? '#ffffff' : '#000000'}
                className="mr-2"
              />
            )}
            
            {!isLoading && leftIcon && (
              <View className="mr-2">
                {leftIcon}
              </View>
            )}
            
            <View className="flex-1 items-center">
              {typeof children === 'function' ? children({ pressed: false, hovered: false }) : (isLoading && loadingText ? loadingText : children)}
            </View>
            
            {!isLoading && rightIcon && (
              <View className="ml-2">
                {rightIcon}
              </View>
            )}
          </View>
        </AnimatedPressable>
      </TextClassContext.Provider>
    );
  }
);

EnhancedButton.displayName = 'EnhancedButton';

export { EnhancedButton, enhancedButtonVariants, enhancedButtonTextVariants };
export type { EnhancedButtonProps };
