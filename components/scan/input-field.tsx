import React, { useState, useCallback } from "react";
import { View, Keyboard } from "react-native";
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
} from "react-native-reanimated";
import { AlertCircle, Check } from "lucide-react-native";
import { Label } from "~/components/ui/label";
import * as Haptics from "expo-haptics";

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
  keyboardType?: "default" | "numeric";
  className?: string;
  validationSchema?: z.ZodSchema;
  label?: string;
  helperText?: string;
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
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const focusAnimation = useSharedValue(0);
  const errorAnimation = useSharedValue(0);
  const successAnimation = useSharedValue(0);

  const {
    control,
    formState: { errors, isValid },
  } = useForm<InputForm>({
    resolver: zodResolver(validationSchema),
    defaultValues: {
      value: externalValue,
    },
  });

  const debouncedOnChange = useDebouncedCallback(
    (text: string) => {
      onChangeText(text);
      // 触觉反馈
      if (isValid) {
        Haptics.selectionAsync();
      }
    },
    300
  );

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    focusAnimation.value = withTiming(1, { duration: 200 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    focusAnimation.value = withTiming(0, { duration: 200 });
    Keyboard.dismiss();
  }, []);

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

    return {
      borderWidth: withSpring(isFocused ? 2 : 1, {
        mass: 0.5,
        damping: 12,
      }),
      borderColor: errors.value
        ? errorBorderColor
        : isValid && !isFocused
        ? successBorderColor
        : borderColor,
      transform: [
        {
          scale: withSpring(isFocused ? 1.02 : 1, {
            mass: 0.5,
            damping: 12,
          }),
        },
      ],
      backgroundColor: withTiming(
        isFocused
          ? "hsl(var(--background))"
          : "hsla(var(--card) / 0.8)",
        { duration: 200 }
      ),
    };
  });

  const labelStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: withSpring(isFocused ? -8 : 0, {
          mass: 0.5,
          damping: 12,
        }),
      },
      {
        scale: withSpring(isFocused ? 0.85 : 1, {
          mass: 0.5,
          damping: 12,
        }),
      },
    ],
    color: interpolateColor(
      focusAnimation.value,
      [0, 1],
      ["hsl(var(--muted-foreground))", "hsl(var(--primary))"]
    ),
  }));

  const errorLabelStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: withTiming(errors.value ? 0 : -10, {
          duration: 200,
        }),
      },
      {
        scale: withSpring(errors.value ? 1 : 0.8, {
          mass: 0.5,
          damping: 12,
        }),
      },
    ],
    opacity: withTiming(errors.value ? 1 : 0, {
      duration: 200,
    }),
  }));

  return (
    <Animated.View
      layout={Layout.springify()}
      className="space-y-2"
    >
      {label && (
        <Animated.Text style={labelStyle} className="text-sm font-medium px-1">
          {label}
        </Animated.Text>
      )}

      <Controller
        control={control}
        name="value"
        render={({ field: { onChange, value } }) => (
          <Animated.View className="relative" style={inputContainerStyle}>
            <Input
              value={value}
              onChangeText={(text) => {
                onChange(text);
                debouncedOnChange(text);
              }}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder={placeholder}
              editable={!disabled}
              keyboardType={keyboardType}
              className={`
                ${className}
                py-3 px-4 text-base
                bg-transparent
                rounded-xl
                backdrop-blur-lg
                shadow-sm
                placeholder:text-muted-foreground/50
              `}
            />
            <Animated.View
              className="absolute right-3 top-1/2 -translate-y-1/2"
              entering={FadeInDown.springify()}
              exiting={FadeOutUp.springify()}
            >
              {errors.value ? (
                <AlertCircle size={18} className="text-destructive" />
              ) : isValid && !isFocused ? (
                <Check size={18} className="text-success" />
              ) : null}
            </Animated.View>
          </Animated.View>
        )}
      />

      <Animated.View style={errorLabelStyle}>
        {errors.value && (
          <Label className="text-destructive text-sm px-1 flex-row items-center space-x-1">
            <AlertCircle size={14} />
            <Label>{errors.value.message}</Label>
          </Label>
        )}
      </Animated.View>

      {helperText && !errors.value && (
        <Label className="text-xs text-muted-foreground px-1">
          {helperText}
        </Label>
      )}
    </Animated.View>
  );
};

export default React.memo(InputField);
