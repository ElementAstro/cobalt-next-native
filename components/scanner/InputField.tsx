import React from "react";
import { Input } from "@/components/ui/input";
import { useDebouncedCallback } from "use-debounce";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Animated, { FadeInDown, FadeOutUp } from "react-native-reanimated";
import { AlertCircle } from "lucide-react-native";
import { Label } from "@/components/ui/label";
import { View } from "react-native";

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
}

const InputField: React.FC<InputFieldProps> = ({
  value: externalValue,
  onChangeText,
  placeholder,
  disabled = false,
  keyboardType = "default",
  className = "",
  validationSchema = inputSchema,
}) => {
  const {
    control,
    formState: { errors },
  } = useForm<InputForm>({
    resolver: zodResolver(validationSchema),
    defaultValues: {
      value: externalValue,
    },
  });

  const debouncedOnChange = useDebouncedCallback((text: string) => {
    onChangeText(text);
  }, 300);

  return (
    <View className="space-y-1">
      <Controller
        control={control}
        name="value"
        render={({ field: { onChange, value } }) => (
          <View className="relative">
            <Input
              value={value}
              onChangeText={(text) => {
                onChange(text);
                debouncedOnChange(text);
              }}
              placeholder={placeholder}
              editable={!disabled}
              keyboardType={keyboardType}
              className={`${className} ${errors.value ? "border-red-500" : ""}`}
            />
            {errors.value && (
              <Animated.View
                entering={FadeInDown.duration(200)}
                exiting={FadeOutUp.duration(200)}
                className="absolute right-2 top-1/2 -translate-y-1/2"
              >
                <AlertCircle size={16} className="text-red-500" />
              </Animated.View>
            )}
          </View>
        )}
      />
      {errors.value && (
        <Animated.View
          entering={FadeInDown.duration(200)}
          exiting={FadeOutUp.duration(200)}
        >
          <Label className="text-red-500 text-sm">{errors.value.message}</Label>
        </Animated.View>
      )}
    </View>
  );
};

export default React.memo(InputField);
