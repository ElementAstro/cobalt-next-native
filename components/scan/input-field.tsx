import React, { useState, useCallback, useEffect } from "react";
import { View, Keyboard, Pressable, AccessibilityInfo } from "react-native";
import { Input } from "~/components/ui/input";
import { useDebouncedCallback } from "use-debounce";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Animated, {
  FadeInDown,
  FadeOutUp,
  Layout,
  withSpring,
  withTiming,
  useAnimatedStyle,
  interpolateColor,
  useSharedValue,
  withSequence,
  withDelay,
  withRepeat,
  ZoomIn,
  SlideInRight,
  SlideInDown,
  Easing,
} from "react-native-reanimated";
import {
  AlertCircle,
  Check,
  Eye,
  EyeOff,
  X,
  AlertOctagon,
  Info,
  Loader2,
} from "lucide-react-native";
import { Label } from "~/components/ui/label";
import { Text } from "~/components/ui/text";
import * as Haptics from "expo-haptics";
import { useColorScheme } from "nativewind";

// Zod schema for validation
const inputSchema = z.object({
  value: z.string().min(1, "不能为空").max(100, "超过最大长度限制"),
});

type InputForm = z.infer<typeof inputSchema>;

interface InputFieldProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  disabled?: boolean;
  keyboardType?: "default" | "numeric" | "email-address" | "phone-pad" | "url";
  className?: string;
  validationSchema?: z.ZodSchema;
  label?: string;
  helperText?: string;
  errorText?: string;
  secureTextEntry?: boolean;
  autoComplete?:
    | "name"
    | "email"
    | "password"
    | "off"
    | "username"
    | "current-password"
    | "new-password"
    | "one-time-code"
    | undefined;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  maxLength?: number;
  loading?: boolean;
}

const InputField: React.FC<InputFieldProps> = ({
  value: externalValue,
  onChangeText,
  placeholder,
  disabled = false,
  keyboardType = "default",
  className = "",
  validationSchema = inputSchema,
  label,
  helperText,
  errorText,
  secureTextEntry = false,
  autoComplete,
  autoCapitalize = "sentences",
  maxLength,
  loading = false,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(!secureTextEntry);
  const [screenReaderEnabled, setScreenReaderEnabled] = useState(false);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  // 动画值
  const focusAnimation = useSharedValue(0);
  const errorAnimation = useSharedValue(0);
  const successAnimation = useSharedValue(0);
  const shakeAnimation = useSharedValue(0);
  const labelPositionY = useSharedValue(0);
  const labelScale = useSharedValue(1);
  const fadeAnim = useSharedValue(0);

  const {
    control,
    formState: { errors, isValid, isDirty },
    setValue,
    getValues,
    trigger,
  } = useForm<InputForm>({
    resolver: zodResolver(validationSchema),
    defaultValues: {
      value: externalValue,
    },
    mode: "onChange",
  });

  // 检查屏幕阅读器状态
  useEffect(() => {
    AccessibilityInfo.isScreenReaderEnabled().then(setScreenReaderEnabled);
    const subscription = AccessibilityInfo.addEventListener(
      "screenReaderChanged",
      setScreenReaderEnabled
    );
    return () => subscription.remove();
  }, []);

  // 处理外部错误
  useEffect(() => {
    if (errorText) {
      errorAnimation.value = withTiming(1, { duration: 200 });
      successAnimation.value = withTiming(0, { duration: 200 });

      // 触发抖动动画
      shakeAnimation.value = withSequence(
        withTiming(-3, { duration: 50 }),
        withRepeat(
          withSequence(
            withTiming(6, { duration: 100 }),
            withTiming(-6, { duration: 100 })
          ),
          2
        ),
        withTiming(0, { duration: 50 })
      );

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [errorText]);

  // 响应外部值更新
  useEffect(() => {
    setValue("value", externalValue);
    fadeAnim.value = withTiming(1, { duration: 300 });
  }, [externalValue, setValue]);

  const debouncedOnChange = useDebouncedCallback((text: string) => {
    onChangeText(text);
    trigger("value").then((isValid) => {
      if (isValid) {
        // 成功状态反馈
        successAnimation.value = withTiming(1, { duration: 200 });
        errorAnimation.value = withTiming(0, { duration: 200 });
        Haptics.selectionAsync();
      } else if (errors.value) {
        // 错误状态反馈
        errorAnimation.value = withTiming(1, { duration: 200 });
        successAnimation.value = withTiming(0, { duration: 200 });

        // 触发抖动动画
        shakeAnimation.value = withSequence(
          withTiming(-3, { duration: 50 }),
          withRepeat(
            withSequence(
              withTiming(6, { duration: 100 }),
              withTiming(-6, { duration: 100 })
            ),
            1
          ),
          withTiming(0, { duration: 50 })
        );

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    });
  }, 300);

  const togglePasswordVisibility = useCallback(() => {
    setIsPasswordVisible(!isPasswordVisible);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [isPasswordVisible]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    focusAnimation.value = withTiming(1, { duration: 200 });

    if (label) {
      labelPositionY.value = withSpring(-22, {
        damping: 12,
        stiffness: 100,
      });
      labelScale.value = withSpring(0.85, {
        damping: 12,
        stiffness: 100,
      });
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [label]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    focusAnimation.value = withTiming(0, { duration: 200 });

    // 只有当输入为空时才移回标签
    if (label && !getValues().value) {
      labelPositionY.value = withSpring(0, {
        damping: 12,
        stiffness: 100,
      });
      labelScale.value = withSpring(1, {
        damping: 12,
        stiffness: 100,
      });
    }

    Keyboard.dismiss();
  }, [label, getValues]);

  const clearInput = useCallback(() => {
    setValue("value", "");
    onChangeText("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [setValue, onChangeText]);

  // 动画样式
  const containerStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: shakeAnimation.value }],
    };
  });

  const inputContainerStyle = useAnimatedStyle(() => {
    const borderColor = interpolateColor(
      focusAnimation.value,
      [0, 1],
      ["hsl(var(--border))", "hsl(var(--primary))"]
    );

    const errorBorderColor = interpolateColor(
      errorAnimation.value,
      [0, 1],
      [borderColor, "hsl(var(--destructive))"]
    );

    const successBorderColor = interpolateColor(
      successAnimation.value,
      [0, 1],
      [borderColor, "hsl(var(--success))"]
    );

    const finalBorderColor =
      errorText || errors.value
        ? errorBorderColor
        : isValid && isDirty
        ? successBorderColor
        : borderColor;

    return {
      borderWidth: withSpring(isFocused ? 2 : 1, {
        mass: 0.5,
        damping: 12,
      }),
      borderColor: finalBorderColor,
      transform: [
        {
          scale: withSpring(isFocused ? 1.01 : 1, {
            mass: 0.5,
            damping: 12,
          }),
        },
      ],
      backgroundColor: withTiming(
        isFocused
          ? isDark
            ? "hsla(var(--card) / 0.8)"
            : "hsl(var(--background))"
          : isDark
          ? "hsla(var(--card) / 0.5)"
          : "hsla(var(--card) / 0.8)",
        { duration: 200 }
      ),
      shadowOpacity: withTiming(isFocused ? 0.1 : 0, { duration: 200 }),
      shadowRadius: withTiming(isFocused ? 3 : 0, { duration: 200 }),
      elevation: withTiming(isFocused ? 2 : 0, { duration: 200 }),
    };
  });

  const labelStyle = useAnimatedStyle(() => {
    const initialPosition = externalValue ? -22 : 0;
    const initialScale = externalValue ? 0.85 : 1;

    // 如果有初始值，标签就应该在上方
    if (labelPositionY.value === 0 && externalValue) {
      labelPositionY.value = initialPosition;
      labelScale.value = initialScale;
    }

    return {
      transform: [
        { translateY: labelPositionY.value },
        { scale: labelScale.value },
      ],
      color: interpolateColor(
        focusAnimation.value,
        [0, 1],
        ["hsl(var(--muted-foreground))", "hsl(var(--primary))"]
      ),
      fontWeight: withTiming(isFocused ? "600" : "400", { duration: 200 }),
    };
  });

  const errorLabelStyle = useAnimatedStyle(() => ({
    opacity: withTiming(errorText || errors.value ? 1 : 0, { duration: 200 }),
    transform: [
      {
        translateY: withTiming(errorText || errors.value ? 0 : -5, {
          duration: 200,
        }),
      },
    ],
  }));

  const successIconStyle = useAnimatedStyle(() => ({
    opacity: withTiming(
      !errorText && !errors.value && isValid && isDirty ? 1 : 0,
      { duration: 200 }
    ),
    transform: [
      {
        scale: withTiming(
          !errorText && !errors.value && isValid && isDirty ? 1 : 0.8,
          { duration: 200 }
        ),
      },
    ],
  }));

  const errorIconStyle = useAnimatedStyle(() => ({
    opacity: withTiming(errorText || errors.value ? 1 : 0, { duration: 200 }),
    transform: [
      {
        scale: withTiming(errorText || errors.value ? 1 : 0.8, {
          duration: 200,
        }),
      },
    ],
  }));

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
  }));

  return (
    <Animated.View
      style={[containerStyle, fadeStyle]}
      layout={Layout.springify()}
      className="space-y-2"
      accessible={screenReaderEnabled}
      accessibilityRole="none"
    >
      {/* 标签容器 */}
      {label && (
        <View className="relative h-6">
          <Animated.Text
            style={labelStyle}
            className={`absolute left-1 text-sm font-medium`}
            accessibilityRole="header"
            accessibilityLabel={`${label}标签`}
          >
            {label}
          </Animated.Text>
        </View>
      )}

      <Controller
        control={control}
        name="value"
        render={({ field: { onChange, value } }) => (
          <View>
            <Animated.View
              className={`relative overflow-hidden ${
                isFocused ? "shadow-sm" : ""
              }`}
              style={inputContainerStyle}
            >
              <Input
                value={value}
                onChangeText={(text) => {
                  onChange(text);
                  debouncedOnChange(text);
                }}
                onFocus={handleFocus}
                onBlur={handleBlur}
                placeholder={isFocused || !label ? placeholder : ""}
                editable={!disabled && !loading}
                keyboardType={keyboardType}
                secureTextEntry={secureTextEntry && !isPasswordVisible}
                autoComplete={autoComplete}
                autoCapitalize={autoCapitalize}
                maxLength={maxLength}
                accessibilityLabel={label || placeholder}
                accessibilityHint={helperText || "输入文本"}
                accessibilityState={{
                  disabled,
                  selected: isFocused,
                  checked: isValid && isDirty,
                  busy: loading,
                }}
                importantForAccessibility="yes"
                className={`
                  ${className}
                  py-3 px-4 text-base
                  bg-transparent
                  rounded-xl
                  ${disabled || loading ? "opacity-60" : ""}
                  ${
                    secureTextEntry || (value && value.length > 0)
                      ? "pr-10"
                      : ""
                  }
                `}
              />

              {/* 清除按钮 */}
              {value && value.length > 0 && !secureTextEntry && !loading && (
                <Pressable
                  onPress={clearInput}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  accessibilityRole="button"
                  accessibilityLabel="清除输入"
                >
                  <Animated.View entering={ZoomIn.duration(200)}>
                    <X size={16} className="text-muted-foreground" />
                  </Animated.View>
                </Pressable>
              )}

              {/* 密码可见性切换 */}
              {secureTextEntry && !loading && (
                <Pressable
                  onPress={togglePasswordVisibility}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  accessibilityRole="button"
                  accessibilityLabel={
                    isPasswordVisible ? "隐藏密码" : "显示密码"
                  }
                >
                  <Animated.View entering={ZoomIn.duration(200)}>
                    {isPasswordVisible ? (
                      <EyeOff size={18} className="text-muted-foreground" />
                    ) : (
                      <Eye size={18} className="text-muted-foreground" />
                    )}
                  </Animated.View>
                </Pressable>
              )}

              {/* 加载指示器 */}
              {loading && (
                <View className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Animated.View entering={ZoomIn.duration(200)}>
                    <Loader2
                      size={18}
                      className="text-muted-foreground animate-spin"
                    />
                  </Animated.View>
                </View>
              )}

              {/* 验证状态图标 */}
              {!loading && !secureTextEntry && value && value.length > 0 && (
                <>
                  <Animated.View
                    style={successIconStyle}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    pointerEvents="none"
                  >
                    <Check size={18} className="text-success" />
                  </Animated.View>

                  <Animated.View
                    style={errorIconStyle}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    pointerEvents="none"
                  >
                    <AlertCircle size={18} className="text-destructive" />
                  </Animated.View>
                </>
              )}
            </Animated.View>
          </View>
        )}
      />

      {/* 错误消息 */}
      <Animated.View style={errorLabelStyle} className="min-h-5">
        {(errorText || errors.value) && (
          <Animated.View
            entering={SlideInDown.duration(200).springify()}
            className="flex-row items-center space-x-1 px-1"
            accessibilityRole="alert"
            accessibilityLabel={`错误：${errorText || errors.value?.message}`}
          >
            <AlertOctagon size={14} className="text-destructive" />
            <Text className="text-destructive text-xs">
              {errorText || errors.value?.message}
            </Text>
          </Animated.View>
        )}
      </Animated.View>

      {/* 辅助文本 */}
      {helperText && !errorText && !errors.value && (
        <Animated.View
          entering={SlideInRight.duration(200)}
          className="flex-row items-center space-x-1 px-1 min-h-5"
          accessibilityRole="text"
          accessibilityLabel={`提示：${helperText}`}
        >
          <Info size={14} className="text-muted-foreground" />
          <Text className="text-xs text-muted-foreground">{helperText}</Text>
        </Animated.View>
      )}

      {/* 字符计数器 */}
      {maxLength && !errorText && !errors.value && (
        <View className="flex-row justify-end px-1">
          <Text
            className={`text-xs ${
              (getValues().value?.length || 0) > maxLength * 0.8
                ? "text-amber-500"
                : "text-muted-foreground"
            }`}
          >
            {getValues().value?.length || 0}/{maxLength}
          </Text>
        </View>
      )}
    </Animated.View>
  );
};

export default React.memo(InputField);
