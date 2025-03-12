import React, { useCallback, useState, useEffect } from "react";
import { View, Pressable } from "react-native";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import {
  Network,
  RotateCw,
  ChevronDown,
  AlertCircle,
  ChevronsUpDown,
  BookMarked,
  Plus,
  Minus,
  RefreshCw,
} from "lucide-react-native";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  withSpring,
  withTiming,
  useSharedValue,
  FadeOut,
  Layout,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Button } from "~/components/ui/button";
import { useColorScheme } from "nativewind";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner-native";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "~/components/ui/tooltip";
import { Text } from "~/components/ui/text";
import { Badge } from "~/components/ui/badge";

// 预设端口范围
const PORT_RANGE_PRESETS = [
  { label: "常用端口 (1-1024)", start: 1, end: 1024 },
  { label: "全部端口 (1-65535)", start: 1, end: 65535 },
  { label: "Web 服务", custom: "80,443,8080,8443" },
  { label: "数据库服务", custom: "1433,3306,5432,6379,27017" },
  { label: "远程服务", custom: "22,23,3389,5900" },
  { label: "文件传输服务", custom: "20,21,989,990" },
];

// 验证 Schema
const portRangeSchema = z.object({
  start: z
    .number()
    .min(1, "端口范围必须大于 0")
    .max(65535, "端口范围不能超过 65535")
    .optional(),
  end: z
    .number()
    .min(1, "端口范围必须大于 0")
    .max(65535, "端口范围不能超过 65535")
    .optional(),
  customPorts: z
    .string()
    .optional()
    .transform((val) => (val ? val.trim() : "")),
  useCustomPorts: z.boolean().default(false),
});

type PortRangeForm = z.infer<typeof portRangeSchema>;

interface PortRangePickerProps {
  onRangeChange: (range: {
    start?: number;
    end?: number;
    customPorts?: string;
    useCustomPorts: boolean;
  }) => void;
  initialRange?: {
    start?: number;
    end?: number;
    customPorts?: string;
    useCustomPorts?: boolean;
  };
  disabled?: boolean;
  className?: string;
  showTitle?: boolean;
  compact?: boolean;
  error?: string | null;
}

const PortRangePicker: React.FC<PortRangePickerProps> = ({
  onRangeChange,
  initialRange = { start: 1, end: 1024, useCustomPorts: false },
  disabled = false,
  className = "",
  showTitle = true,
  compact = false,
  error = null,
}) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const [showPresets, setShowPresets] = useState(false);
  const buttonScale = useSharedValue(1);
  const errorShake = useSharedValue(0);

  const {
    control,
    formState: { errors, isValid },
    setValue,
    getValues,
    watch,
  } = useForm<PortRangeForm>({
    resolver: zodResolver(portRangeSchema),
    defaultValues: {
      start: initialRange.start || 1,
      end: initialRange.end || 1024,
      customPorts: initialRange.customPorts || "",
      useCustomPorts: initialRange.useCustomPorts || false,
    },
  });

  // 监听表单数据变化
  const watchUseCustomPorts = watch("useCustomPorts");
  const watchStart = watch("start");
  const watchEnd = watch("end");
  const watchCustomPorts = watch("customPorts");

  // 错误动画
  useEffect(() => {
    if (error || errors.start || errors.end || errors.customPorts) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      errorShake.value = withTiming(-5, { duration: 100 });
      setTimeout(() => {
        errorShake.value = withTiming(5, { duration: 100 });
        setTimeout(() => {
          errorShake.value = withTiming(-5, { duration: 100 });
          setTimeout(() => {
            errorShake.value = withTiming(0, { duration: 100 });
          }, 100);
        }, 100);
      }, 100);
    }
  }, [error, errors.start, errors.end, errors.customPorts]);

  // 当表单数据变化时触发回调
  useEffect(() => {
    if (onRangeChange && isValid) {
      const values = getValues();
      onRangeChange(values);
    }
  }, [watchStart, watchEnd, watchCustomPorts, watchUseCustomPorts]);

  const applyPreset = useCallback(
    (preset: (typeof PORT_RANGE_PRESETS)[0]) => {
      if (preset.custom) {
        setValue("useCustomPorts", true);
        setValue("customPorts", preset.custom);
        setValue("start", undefined);
        setValue("end", undefined);
      } else {
        setValue("useCustomPorts", false);
        setValue("start", preset.start);
        setValue("end", preset.end);
        setValue("customPorts", "");
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success(`已应用预设：${preset.label}`, { duration: 2000 });

      const values = getValues();
      onRangeChange(values);
      setShowPresets(false);
    },
    [setValue, getValues, onRangeChange]
  );

  const togglePortMode = useCallback(() => {
    const useCustomPorts = !getValues().useCustomPorts;
    setValue("useCustomPorts", useCustomPorts);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const values = getValues();
    onRangeChange(values);
  }, [setValue, getValues, onRangeChange]);

  const resetToDefault = useCallback(() => {
    setValue("start", 1);
    setValue("end", 1024);
    setValue("customPorts", "");
    setValue("useCustomPorts", false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    toast.info("已重置为默认端口范围", { duration: 2000 });
    const values = getValues();
    onRangeChange(values);
  }, [setValue, getValues, onRangeChange]);

  // 动画样式
  const containerStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateX: errorShake.value,
        },
      ],
    };
  });

  const presetsButtonStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          scale: withSpring(buttonScale.value, {
            damping: 5,
            stiffness: 100,
          }),
        },
      ],
    };
  });

  // 简易版
  if (compact) {
    return (
      <Animated.View
        style={containerStyle}
        className={`space-y-2 ${className}`}
      >
        <View className="flex-row justify-between items-center">
          {showTitle && (
            <View className="flex-row items-center space-x-2">
              <Network size={18} className="text-primary" />
              <Label className="text-base font-medium">端口范围</Label>
            </View>
          )}
          <Tooltip>
            <TooltipTrigger>
              <Animated.View
                style={presetsButtonStyle}
                onTouchStart={() => {
                  buttonScale.value = 0.95;
                }}
                onTouchEnd={() => {
                  buttonScale.value = 1;
                }}
              >
                <Button
                  variant="outline"
                  size="sm"
                  disabled={disabled}
                  className="rounded-lg border-primary/30"
                >
                  <BookMarked size={16} className="text-primary mr-1" />
                  <Label className="text-xs">预设</Label>
                  <ChevronDown
                    size={14}
                    className="text-muted-foreground ml-1"
                  />
                </Button>
              </Animated.View>
            </TooltipTrigger>
            <TooltipContent>
              <Text>端口预设</Text>
              <View className="flex-col space-y-2 mt-2">
                {PORT_RANGE_PRESETS.map((preset, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    size="sm"
                    onPress={() => applyPreset(preset)}
                    disabled={disabled}
                    className="justify-between"
                  >
                    <View className="flex-row items-center">
                      <Network size={16} className="mr-2 text-primary" />
                      <Text>{preset.label}</Text>
                    </View>
                    {preset.custom ? (
                      <Badge
                        variant="outline"
                        className="ml-2 px-1 py-0 bg-primary/5"
                      >
                        <Text className="text-xs">{preset.custom}</Text>
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="ml-2 px-1 py-0 bg-primary/5"
                      >
                        <Text className="text-xs">
                          {preset.start}-{preset.end}
                        </Text>
                      </Badge>
                    )}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  onPress={resetToDefault}
                  disabled={disabled}
                >
                  <View className="flex-row items-center">
                    <RefreshCw
                      size={16}
                      className="mr-2 text-muted-foreground"
                    />
                    <Text>重置为默认</Text>
                  </View>
                </Button>
              </View>
            </TooltipContent>
          </Tooltip>
        </View>

        <View className="space-y-2">
          <Controller
            control={control}
            name="useCustomPorts"
            render={({ field: { value } }) => (
              <View className="flex-row justify-between items-center">
                <Label className="text-sm">
                  {value ? "使用自定义端口列表" : "使用端口范围"}
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onPress={togglePortMode}
                  disabled={disabled}
                  className="h-8 px-2"
                >
                  <Label className="text-xs text-primary">
                    切换至{value ? "范围模式" : "列表模式"}
                  </Label>
                </Button>
              </View>
            )}
          />

          {!watchUseCustomPorts ? (
            <View className="flex-row space-x-2 items-center">
              <Controller
                control={control}
                name="start"
                render={({ field: { onChange, value } }) => (
                  <Input
                    value={String(value || "")}
                    onChangeText={(text) => onChange(Number(text) || undefined)}
                    keyboardType="numeric"
                    placeholder="起始端口"
                    className="flex-1 text-center"
                    editable={!disabled}
                  />
                )}
              />
              <Label className="text-muted-foreground">至</Label>
              <Controller
                control={control}
                name="end"
                render={({ field: { onChange, value } }) => (
                  <Input
                    value={String(value || "")}
                    onChangeText={(text) => onChange(Number(text) || undefined)}
                    keyboardType="numeric"
                    placeholder="结束端口"
                    className="flex-1 text-center"
                    editable={!disabled}
                  />
                )}
              />
            </View>
          ) : (
            <Controller
              control={control}
              name="customPorts"
              render={({ field: { onChange, value } }) => (
                <Input
                  value={value || ""}
                  onChangeText={onChange}
                  placeholder="输入端口列表，用逗号分隔 (例如: 80,443,8080)"
                  editable={!disabled}
                />
              )}
            />
          )}
        </View>

        {(error || errors.start || errors.end || errors.customPorts) && (
          <View className="flex-row items-center space-x-2">
            <AlertCircle size={14} className="text-destructive" />
            <Label className="text-xs text-destructive">
              {error ||
                errors.start?.message ||
                errors.end?.message ||
                errors.customPorts?.message}
            </Label>
          </View>
        )}
      </Animated.View>
    );
  }

  // 完整版
  return (
    <Animated.View
      style={containerStyle}
      className={`space-y-4 ${className}`}
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(200)}
      layout={Layout.springify()}
    >
      {showTitle && (
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center space-x-2">
            <Network size={20} className="text-primary" />
            <Label className="text-lg font-medium">端口范围设置</Label>
          </View>
          <Animated.View
            style={presetsButtonStyle}
            onTouchStart={() => {
              buttonScale.value = 0.95;
            }}
            onTouchEnd={() => {
              buttonScale.value = 1;
            }}
          >
            <Button
              variant="outline"
              size="sm"
              onPress={() => setShowPresets(!showPresets)}
              disabled={disabled}
              className="rounded-lg border-primary/30"
            >
              <BookMarked size={16} className="text-primary mr-1" />
              <Label className="text-xs">使用预设</Label>
              <ChevronDown size={14} className="text-muted-foreground ml-1" />
            </Button>
          </Animated.View>
        </View>
      )}

      {/* 预设选择栏 */}
      {showPresets && (
        <Animated.View
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(200)}
          className="bg-card/80 backdrop-blur-lg p-3 rounded-xl border border-border/30"
        >
          <Label className="text-sm mb-2 text-muted-foreground">
            选择预设端口范围
          </Label>
          <View className="flex-row flex-wrap gap-2">
            {PORT_RANGE_PRESETS.map((preset, index) => (
              <Pressable
                key={index}
                onPress={() => applyPreset(preset)}
                disabled={disabled}
                className={`
                  px-3 py-2 rounded-lg border
                  ${
                    isDark
                      ? "bg-muted/20 border-border/30 active:bg-primary/20"
                      : "bg-background/80 border-border active:bg-primary/10"
                  }
                `}
              >
                <View className="flex-row items-center space-x-1">
                  <Network size={14} className="text-primary" />
                  <Label className="text-xs">{preset.label}</Label>
                </View>
                {preset.custom ? (
                  <Label className="text-xs text-muted-foreground mt-1">
                    {preset.custom}
                  </Label>
                ) : (
                  <Label className="text-xs text-muted-foreground mt-1">
                    {preset.start}-{preset.end}
                  </Label>
                )}
              </Pressable>
            ))}
          </View>
        </Animated.View>
      )}

      <View className="bg-card/80 backdrop-blur-lg p-4 rounded-xl border border-border/30 space-y-4">
        {/* 切换输入模式按钮 */}
        <Controller
          control={control}
          name="useCustomPorts"
          render={({ field: { value, onChange } }) => (
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center space-x-2">
                <ChevronsUpDown size={18} className="text-primary" />
                <Label className="text-base font-medium">输入模式</Label>
              </View>
              <View className="flex-row overflow-hidden rounded-lg border border-border bg-muted/20">
                <Pressable
                  onPress={() => {
                    if (value) {
                      onChange(false);
                      togglePortMode();
                    }
                  }}
                  disabled={disabled || !value}
                  className={`
                    px-3 py-1.5
                    ${!value ? "bg-primary" : "bg-transparent"}
                  `}
                >
                  <Label
                    className={`text-xs ${
                      !value
                        ? "text-primary-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    范围
                  </Label>
                </Pressable>
                <Pressable
                  onPress={() => {
                    if (!value) {
                      onChange(true);
                      togglePortMode();
                    }
                  }}
                  disabled={disabled || value}
                  className={`
                    px-3 py-1.5
                    ${value ? "bg-primary" : "bg-transparent"}
                  `}
                >
                  <Label
                    className={`text-xs ${
                      value
                        ? "text-primary-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    列表
                  </Label>
                </Pressable>
              </View>
            </View>
          )}
        />

        {/* 条件渲染表单 */}
        {!watchUseCustomPorts ? (
          <View className="space-y-3">
            <Label className="text-sm text-muted-foreground">
              请设置要扫描的端口范围
            </Label>
            <View className="space-y-2">
              <View className="flex-row items-center space-x-3">
                <Label className="w-20 text-sm">起始端口:</Label>
                <Controller
                  control={control}
                  name="start"
                  render={({ field: { onChange, value } }) => (
                    <View className="flex-1">
                      <Input
                        value={String(value || "")}
                        onChangeText={(text) =>
                          onChange(Number(text) || undefined)
                        }
                        keyboardType="numeric"
                        placeholder="1"
                        editable={!disabled}
                        className="text-center"
                      />
                      {errors.start && (
                        <Label className="text-xs text-destructive mt-1">
                          {errors.start.message}
                        </Label>
                      )}
                    </View>
                  )}
                />
                <View className="flex-row space-x-1">
                  <Button
                    variant="outline"
                    size="icon"
                    onPress={() => {
                      const current = getValues().start || 0;
                      setValue("start", Math.max(1, current - 1));
                      const values = getValues();
                      onRangeChange(values);
                    }}
                    disabled={disabled}
                    className="h-8 w-8 p-0"
                  >
                    <Minus size={14} />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onPress={() => {
                      const current = getValues().start || 0;
                      setValue("start", Math.min(65535, current + 1));
                      const values = getValues();
                      onRangeChange(values);
                    }}
                    disabled={disabled}
                    className="h-8 w-8 p-0"
                  >
                    <Plus size={14} />
                  </Button>
                </View>
              </View>

              <View className="flex-row items-center space-x-3">
                <Label className="w-20 text-sm">结束端口:</Label>
                <Controller
                  control={control}
                  name="end"
                  render={({ field: { onChange, value } }) => (
                    <View className="flex-1">
                      <Input
                        value={String(value || "")}
                        onChangeText={(text) =>
                          onChange(Number(text) || undefined)
                        }
                        keyboardType="numeric"
                        placeholder="1024"
                        editable={!disabled}
                        className="text-center"
                      />
                      {errors.end && (
                        <Label className="text-xs text-destructive mt-1">
                          {errors.end.message}
                        </Label>
                      )}
                    </View>
                  )}
                />
                <View className="flex-row space-x-1">
                  <Button
                    variant="outline"
                    size="icon"
                    onPress={() => {
                      const current = getValues().end || 0;
                      setValue("end", Math.max(1, current - 1));
                      const values = getValues();
                      onRangeChange(values);
                    }}
                    disabled={disabled}
                    className="h-8 w-8 p-0"
                  >
                    <Minus size={14} />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onPress={() => {
                      const current = getValues().end || 0;
                      setValue("end", Math.min(65535, current + 1));
                      const values = getValues();
                      onRangeChange(values);
                    }}
                    disabled={disabled}
                    className="h-8 w-8 p-0"
                  >
                    <Plus size={14} />
                  </Button>
                </View>
              </View>

              <View className="pt-2">
                {watchStart !== undefined && watchEnd !== undefined && (
                  <Badge
                    variant="outline"
                    className="bg-primary/5 self-start mt-1"
                  >
                    <Label className="text-xs">
                      将扫描{" "}
                      {watchEnd - watchStart + 1 > 0
                        ? watchEnd - watchStart + 1
                        : 0}{" "}
                      个端口
                    </Label>
                  </Badge>
                )}
              </View>
            </View>
          </View>
        ) : (
          <View className="space-y-3">
            <Label className="text-sm text-muted-foreground">
              输入多个端口，用逗号分隔
            </Label>
            <Controller
              control={control}
              name="customPorts"
              render={({ field: { onChange, value } }) => (
                <View>
                  <Input
                    value={value || ""}
                    onChangeText={onChange}
                    placeholder="例如: 80,443,8080,8443"
                    editable={!disabled}
                    multiline
                    numberOfLines={2}
                    textAlignVertical="top"
                    className="min-h-[60px] py-2"
                  />
                  {errors.customPorts && (
                    <Label className="text-xs text-destructive mt-1">
                      {errors.customPorts.message}
                    </Label>
                  )}
                </View>
              )}
            />

            <View className="pt-1">
              {watchCustomPorts && (
                <Badge
                  variant="outline"
                  className="bg-primary/5 self-start mt-1"
                >
                  <Label className="text-xs">
                    将扫描{" "}
                    {
                      watchCustomPorts.split(",").filter((p) => p.trim() !== "")
                        .length
                    }{" "}
                    个端口
                  </Label>
                </Badge>
              )}
            </View>
          </View>
        )}

        {/* 重置按钮 */}
        <View className="flex-row justify-end">
          <Button
            variant="ghost"
            size="sm"
            onPress={resetToDefault}
            disabled={disabled}
            className="px-3 py-1"
          >
            <RotateCw size={14} className="mr-1 text-muted-foreground" />
            <Label className="text-xs text-muted-foreground">重置为默认</Label>
          </Button>
        </View>
      </View>

      {/* 错误显示 */}
      {error && (
        <View className="flex-row items-center space-x-2 bg-destructive/10 p-2 rounded-lg">
          <AlertCircle size={16} className="text-destructive" />
          <Label className="text-sm text-destructive">{error}</Label>
        </View>
      )}
    </Animated.View>
  );
};

export default React.memo(PortRangePicker);
