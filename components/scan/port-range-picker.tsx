import React, { useCallback, useState, useEffect, useRef } from "react";
import { View, Pressable, AccessibilityInfo } from "react-native";
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
  Star,
  Bookmark,
  Info,
  PlusCircle,
  Loader2,
  Dices,
} from "lucide-react-native";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  withSpring,
  withTiming,
  useSharedValue,
  FadeOut,
  Layout,
  ZoomIn,
  SlideInDown,
  SlideOutDown,
  withSequence,
  withRepeat,
  Easing,
  SlideInUp,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
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
    .transform((val) => (val ? val.trim() : ""))
    .refine(
      (val) => !val || /^(\d+)(,\s*\d+)*$/.test(val),
      { message: "格式无效，请使用逗号分隔端口号" }
    ),
  useCustomPorts: z.boolean().default(false),
}).refine(
  (data) => {
    const { start, end } = data;
    return !start || !end || end >= start;
  },
  {
    message: "结束端口必须大于或等于起始端口",
    path: ["end"]
  }
);

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
  isLoading?: boolean;
}

const AnimatedButton = Animated.createAnimatedComponent(Button);

const PortRangePicker: React.FC<PortRangePickerProps> = ({
  onRangeChange,
  initialRange = { start: 1, end: 1024, useCustomPorts: false },
  disabled = false,
  className = "",
  showTitle = true,
  compact = false,
  error = null,
  isLoading = false,
}) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const [showPresets, setShowPresets] = useState(false);
  const [screenReaderEnabled, setScreenReaderEnabled] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const buttonScale = useSharedValue(1);
  const errorShake = useSharedValue(0);
  const presetsHeight = useSharedValue(0);
  const randomizeScale = useSharedValue(1);
  const customInputRef = useRef<any>(null);
  const startInputRef = useRef<any>(null);
  const endInputRef = useRef<any>(null);

  const {
    control,
    formState: { errors, isValid },
    setValue,
    getValues,
    watch,
    trigger,
  } = useForm<PortRangeForm>({
    resolver: zodResolver(portRangeSchema),
    defaultValues: {
      start: initialRange.start || 1,
      end: initialRange.end || 1024,
      customPorts: initialRange.customPorts || "",
      useCustomPorts: initialRange.useCustomPorts || false,
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

  // 监听表单数据变化
  const watchUseCustomPorts = watch("useCustomPorts");
  const watchStart = watch("start");
  const watchEnd = watch("end");
  const watchCustomPorts = watch("customPorts");

  // 预设面板动画
  useEffect(() => {
    presetsHeight.value = withTiming(showPresets ? 260 : 0, {
      duration: 300,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
  }, [showPresets, presetsHeight]);

  // 错误动画
  useEffect(() => {
    if (error || errors.start || errors.end || errors.customPorts) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      errorShake.value = withSequence(
        withTiming(-5, { duration: 100 }),
        withTiming(5, { duration: 100 }),
        withTiming(-5, { duration: 100 }),
        withTiming(0, { duration: 100 })
      );
    }
  }, [error, errors.start, errors.end, errors.customPorts]);

  // 当表单数据变化时触发回调
  useEffect(() => {
    if (onRangeChange && isValid) {
      const values = getValues();
      onRangeChange(values);
    }
  }, [watchStart, watchEnd, watchCustomPorts, watchUseCustomPorts, isValid, onRangeChange, getValues]);

  // 应用预设
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
      
      buttonScale.value = withSequence(
        withTiming(0.9, { duration: 100 }),
        withTiming(1.1, { duration: 100 }),
        withTiming(1, { duration: 150 })
      );
      
      toast.success(`已应用预设：${preset.label}`, { duration: 2000 });

      const values = getValues();
      onRangeChange(values);
      setShowPresets(false);
      
      trigger();
    },
    [setValue, getValues, onRangeChange, buttonScale, trigger]
  );

  // 切换端口输入模式
  const togglePortMode = useCallback(() => {
    const useCustomPorts = !getValues().useCustomPorts;
    setValue("useCustomPorts", useCustomPorts);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // 重置与当前模式不匹配的值
    if (useCustomPorts) {
      // 聚焦自定义端口输入框
      setTimeout(() => {
        if (customInputRef.current) {
          customInputRef.current.focus();
        }
      }, 100);
    } else {
      // 聚焦起始端口输入框
      setTimeout(() => {
        if (startInputRef.current) {
          startInputRef.current.focus();
        }
      }, 100);
    }
    
    trigger();
    
    const values = getValues();
    onRangeChange(values);
  }, [setValue, getValues, onRangeChange, trigger]);

  // 重置为默认值
  const resetToDefault = useCallback(() => {
    setValue("start", 1);
    setValue("end", 1024);
    setValue("customPorts", "");
    setValue("useCustomPorts", false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    toast.info("已重置为默认端口范围", { 
      duration: 2000,
      icon: <RefreshCw size={16} />
    });
    const values = getValues();
    onRangeChange(values);
    
    trigger();
  }, [setValue, getValues, onRangeChange, trigger]);

  // 生成随机端口
  const generateRandomPorts = useCallback(async () => {
    randomizeScale.value = withSequence(
      withTiming(0.8, { duration: 100 }),
      withTiming(1.2, { duration: 150 }),
      withTiming(1, { duration: 150 })
    );
    
    setIsGenerating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // 模拟生成随机端口的延迟
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (watchUseCustomPorts) {
      // 生成 5-10 个随机端口
      const count = Math.floor(Math.random() * 6) + 5;
      const randomPorts = [];
      for (let i = 0; i < count; i++) {
        randomPorts.push(Math.floor(Math.random() * 65535) + 1);
      }
      setValue("customPorts", randomPorts.join(", "));
    } else {
      // 生成随机范围
      const start = Math.floor(Math.random() * 10000) + 1;
      const end = start + Math.floor(Math.random() * 10000) + 100;
      setValue("start", start);
      setValue("end", Math.min(end, 65535));
    }
    
    setIsGenerating(false);
    toast.success("已生成随机端口", { duration: 1500 });
    
    trigger();
    
    const values = getValues();
    onRangeChange(values);
  }, [watchUseCustomPorts, setValue, getValues, onRangeChange, randomizeScale, trigger]);

  // 增加/减少起始或结束端口
  const adjustPortValue = useCallback((field: "start" | "end", increment: boolean) => {
    const current = getValues()[field] || (field === "start" ? 1 : 1024);
    const newValue = increment 
      ? Math.min(65535, current + 1) 
      : Math.max(1, current - 1);
    
    setValue(field, newValue);
    
    const values = getValues();
    onRangeChange(values);
    
    trigger();
    
    Haptics.selectionAsync();
  }, [setValue, getValues, onRangeChange, trigger]);

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
  
  const presetsContainerStyle = useAnimatedStyle(() => {
    return {
      height: presetsHeight.value,
      opacity: withTiming(showPresets ? 1 : 0, { duration: 200 }),
    };
  });
  
  const randomizeButtonStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          scale: randomizeScale.value,
        },
      ],
    };
  });

  // 统计端口数量
  const getPortCount = useCallback(() => {
    if (watchUseCustomPorts) {
      if (!watchCustomPorts) return 0;
      return watchCustomPorts.split(",").filter(p => p.trim() !== "").length;
    } else {
      if (!watchStart || !watchEnd) return 0;
      return watchEnd - watchStart + 1 > 0 ? watchEnd - watchStart + 1 : 0;
    }
  }, [watchUseCustomPorts, watchStart, watchEnd, watchCustomPorts]);

  // 渲染加载中状态
  if (isLoading) {
    return (
      <View className={`space-y-3 ${className}`}>
        {showTitle && (
          <View className="flex-row items-center space-x-2">
            <Skeleton className="w-5 h-5 rounded-full" />
            <Skeleton className="w-32 h-5 rounded-md" />
          </View>
        )}
        
        <View className="space-y-2">
          <View className="flex-row items-center space-x-2">
            <Skeleton className="w-20 h-5 rounded-md" />
            <View className="flex-row">
              <Skeleton className="w-24 h-10 rounded-lg mr-2" />
              <Skeleton className="w-24 h-10 rounded-lg" />
            </View>
          </View>
          
          <Skeleton className="w-full h-10 rounded-lg" />
          
          <View className="flex-row justify-end">
            <Skeleton className="w-24 h-8 rounded-md" />
          </View>
        </View>
      </View>
    );
  }

  // 简易版
  if (compact) {
    return (
      <Animated.View
        style={containerStyle}
        className={`space-y-2 ${className}`}
        layout={Layout.springify()}
      >
        <View className="flex-row justify-between items-center">
          {showTitle && (
            <View className="flex-row items-center space-x-2">
              <Network size={18} className="text-primary" />
              <Label className="text-base font-medium">端口范围</Label>
            </View>
          )}
          <View className="flex-row space-x-2">
            <Animated.View
              style={presetsButtonStyle}
              onTouchStart={() => {
                buttonScale.value = 0.95;
              }}
              onTouchEnd={() => {
                buttonScale.value = 1;
              }}
            >
              <Tooltip>
                <TooltipTrigger>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={disabled}
                    className="rounded-lg border-primary/30"
                    onPress={() => setShowPresets(!showPresets)}
                    accessibilityLabel="端口预设选项"
                    accessibilityHint="打开预设端口范围选项"
                  >
                    <BookMarked size={16} className="text-primary mr-1" />
                    <Label className="text-xs">预设</Label>
                    <ChevronDown
                      size={14}
                      className="text-muted-foreground ml-1"
                    />
                  </Button>
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
            </Animated.View>
            
            <Animated.View style={randomizeButtonStyle}>
              <Button
                variant="outline"
                size="sm"
                disabled={disabled || isGenerating}
                className="rounded-lg"
                onPress={generateRandomPorts}
                accessibilityLabel="生成随机端口"
                accessibilityHint="生成随机端口或端口范围"
              >
                {isGenerating ? (
                  <Loader2 size={16} className="text-primary animate-spin" />
                ) : (
                  <Dices size={16} className="text-primary" />
                )}
              </Button>
            </Animated.View>
          </View>
        </View>
        
        {/* 预设面板 (紧凑模式) */}
        <Animated.View 
          style={presetsContainerStyle}
          className="overflow-hidden"
        >
          <View className="bg-card/80 backdrop-blur-lg p-3 rounded-xl border border-border/30 mt-1">
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
                  accessibilityLabel={`应用预设: ${preset.label}`}
                  accessibilityRole="button"
                >
                  <View className="flex-row items-center space-x-1">
                    <Star size={14} className="text-primary" />
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
          </View>
        </Animated.View>

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
                  accessibilityLabel={`切换至${value ? "范围模式" : "列表模式"}`}
                  accessibilityHint={`当前为${value ? "自定义端口列表" : "端口范围"}模式，点击切换`}
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
                  <View className="flex-1">
                    <Input
                      ref={startInputRef}
                      value={String(value || "")}
                      onChangeText={(text) => {
                        const numValue = text ? Number(text) : undefined;
                        onChange(numValue);
                        trigger("start");
                      }}
                      keyboardType="numeric"
                      placeholder="起始端口"
                      className="flex-1 text-center"
                      editable={!disabled}
                      accessibilityLabel="起始端口"
                      accessibilityHint="输入端口扫描的起始端口号"
                    />
                  </View>
                )}
              />
              <Label className="text-muted-foreground">至</Label>
              <Controller
                control={control}
                name="end"
                render={({ field: { onChange, value } }) => (
                  <View className="flex-1">
                    <Input
                      ref={endInputRef}
                      value={String(value || "")}
                      onChangeText={(text) => {
                        const numValue = text ? Number(text) : undefined;
                        onChange(numValue);
                        trigger("end");
                      }}
                      keyboardType="numeric"
                      placeholder="结束端口"
                      className="flex-1 text-center"
                      editable={!disabled}
                      accessibilityLabel="结束端口"
                      accessibilityHint="输入端口扫描的结束端口号"
                    />
                  </View>
                )}
              />
            </View>
          ) : (
            <Controller
              control={control}
              name="customPorts"
              render={({ field: { onChange, value } }) => (
                <View>
                  <Input
                    ref={customInputRef}
                    value={value || ""}
                    onChangeText={(text) => {
                      onChange(text);
                      trigger("customPorts");
                    }}
                    placeholder="输入端口列表，用逗号分隔 (例如: 80,443,8080)"
                    editable={!disabled}
                    accessibilityLabel="自定义端口列表"
                    accessibilityHint="输入要扫描的端口列表，使用逗号分隔"
                  />
                </View>
              )}
            />
          )}
        </View>
        
        {(errors.start || errors.end || errors.customPorts || error) && (
          <Animated.View 
            entering={SlideInDown.duration(200).springify()} 
            className="flex-row items-center space-x-2 bg-destructive/10 px-2 py-1 rounded-lg"
          >
            <AlertCircle size={14} className="text-destructive" />
            <Label className="text-xs text-destructive">
              {error ||
                errors.start?.message ||
                errors.end?.message ||
                errors.customPorts?.message}
            </Label>
          </Animated.View>
        )}
        
        {getPortCount() > 0 && !error && !errors.start && !errors.end && !errors.customPorts && (
          <View className="flex-row justify-end">
            <Badge
              variant="outline"
              className="bg-primary/5 self-start"
            >
              <Label className="text-xs">
                将扫描 {getPortCount()} 个端口
              </Label>
            </Badge>
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
          <View className="flex-row space-x-2">
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
                accessibilityLabel="端口预设选项"
                accessibilityHint={showPresets ? "关闭预设选项" : "打开预设选项"}
              >
                <Bookmark size={16} className="text-primary mr-1" />
                <Label className="text-xs">预设</Label>
                <ChevronDown size={14} className={`text-muted-foreground ml-1 transition-transform duration-200 ${showPresets ? 'rotate-180' : 'rotate-0'}`} />
              </Button>
            </Animated.View>
            
            <Animated.View style={randomizeButtonStyle}>
              <Button
                variant="outline"
                size="sm"
                disabled={disabled || isGenerating}
                className="rounded-lg border-primary/30"
                onPress={generateRandomPorts}
                accessibilityLabel="生成随机端口"
                accessibilityHint="生成随机端口或端口范围"
              >
                {isGenerating ? (
                  <Loader2 size={16} className="text-primary animate-spin mr-1" />
                ) : (
                  <Dices size={16} className="text-primary mr-1" />
                )}
                <Label className="text-xs">随机</Label>
              </Button>
            </Animated.View>
          </View>
        </View>
      )}

      {/* 预设选择栏 */}
      <Animated.View
        style={presetsContainerStyle}
        className="overflow-hidden"
      >
        <View className="bg-card/80 backdrop-blur-lg p-3 rounded-xl border border-border/30">
          <View className="flex-row justify-between items-center mb-2">
            <Label className="text-sm font-medium">选择预设端口范围</Label>
            <Button
              variant="ghost"
              size="sm"
              onPress={() => setShowPresets(false)}
              className="h-7 px-2"
            >
              <Label className="text-xs text-muted-foreground">关闭</Label>
            </Button>
          </View>
          <View className="flex-row flex-wrap gap-2">
            {PORT_RANGE_PRESETS.map((preset, index) => (
              <Animated.View 
                key={index}
                entering={SlideInUp.delay(index * 50).duration(200).springify()}
              >
                <Pressable
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
                  accessibilityLabel={`应用预设: ${preset.label}`}
                  accessibilityRole="button"
                >
                  <View className="flex-row items-center space-x-1">
                    <Star size={14} className="text-primary" />
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
              </Animated.View>
            ))}
          </View>
          
          <View className="mt-3 pt-3 border-t border-border/30">
            <View className="flex-row items-center space-x-2">
              <Info size={16} className="text-muted-foreground" />
              <Text className="text-xs text-muted-foreground">
                选择预设可快速应用常用的端口范围设置
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>

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
                  accessibilityLabel="范围模式"
                  accessibilityRole="radio"
                  accessibilityState={{ checked: !value }}
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
                  accessibilityLabel="列表模式"
                  accessibilityRole="radio"
                  accessibilityState={{ checked: value }}
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
                        ref={startInputRef}
                        value={String(value || "")}
                        onChangeText={(text) => {
                          const numValue = text ? Number(text) : undefined;
                          onChange(numValue);
                          trigger("start");
                        }}
                        keyboardType="numeric"
                        placeholder="1"
                        editable={!disabled}
                        className="text-center"
                        accessibilityLabel="起始端口"
                        accessibilityHint="输入端口扫描的起始端口号"
                      />
                      {errors.start && (
                        <Animated.View entering={FadeIn.duration(200)} className="mt-1">
                          <Label className="text-xs text-destructive">
                            {errors.start.message}
                          </Label>
                        </Animated.View>
                      )}
                    </View>
                  )}
                />
                <View className="flex-row space-x-1">
                  <AnimatedButton
                    variant="outline"
                    size="icon"
                    onPress={() => adjustPortValue("start", false)}
                    disabled={disabled}
                    className="h-8 w-8 p-0"
                    accessibilityLabel="减少起始端口"
                  >
                    <Minus size={14} />
                  </AnimatedButton>
                  <AnimatedButton
                    variant="outline"
                    size="icon"
                    onPress={() => adjustPortValue("start", true)}
                    disabled={disabled}
                    className="h-8 w-8 p-0"
                    accessibilityLabel="增加起始端口"
                  >
                    <Plus size={14} />
                  </AnimatedButton>
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
                        ref={endInputRef}
                        value={String(value || "")}
                        onChangeText={(text) => {
                          const numValue = text ? Number(text) : undefined;
                          onChange(numValue);
                          trigger("end");
                        }}
                        keyboardType="numeric"
                        placeholder="1024"
                        editable={!disabled}
                        className="text-center"
                        accessibilityLabel="结束端口"
                        accessibilityHint="输入端口扫描的结束端口号"
                      />
                      {errors.end && (
                        <Animated.View entering={FadeIn.duration(200)} className="mt-1">
                          <Label className="text-xs text-destructive">
                            {errors.end.message}
                          </Label>
                        </Animated.View>
                      )}
                    </View>
                  )}
                />
                <View className="flex-row space-x-1">
                  <AnimatedButton
                    variant="outline"
                    size="icon"
                    onPress={() => adjustPortValue("end", false)}
                    disabled={disabled}
                    className="h-8 w-8 p-0"
                    accessibilityLabel="减少结束端口"
                  >
                    <Minus size={14} />
                  </AnimatedButton>
                  <AnimatedButton
                    variant="outline"
                    size="icon"
                    onPress={() => adjustPortValue("end", true)}
                    disabled={disabled}
                    className="h-8 w-8 p-0"
                    accessibilityLabel="增加结束端口"
                  >
                    <Plus size={14} />
                  </AnimatedButton>
                </View>
              </View>

              {watchStart !== undefined && watchEnd !== undefined && getPortCount() > 0 && (
                <Animated.View entering={ZoomIn.duration(200)}>
                  <Badge
                    variant="outline"
                    className="bg-primary/5 self-start mt-2"
                  >
                    <Label className="text-xs">
                      将扫描 {getPortCount()} 个端口
                    </Label>
                  </Badge>
                </Animated.View>
              )}
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
                    ref={customInputRef}
                    value={value || ""}
                    onChangeText={(text) => {
                      onChange(text);
                      trigger("customPorts");
                    }}
                    placeholder="例如: 80,443,8080,8443"
                    editable={!disabled}
                    multiline
                    numberOfLines={2}
                    textAlignVertical="top"
                    className="min-h-[60px] py-2"
                    accessibilityLabel="自定义端口列表"
                    accessibilityHint="输入要扫描的端口列表，使用逗号分隔"
                  />
                  {errors.customPorts && (
                    <Animated.View entering={FadeIn.duration(200)} className="mt-1">
                      <Label className="text-xs text-destructive">
                        {errors.customPorts.message}
                      </Label>
                    </Animated.View>
                  )}
                </View>
              )}
            />

            {watchCustomPorts && getPortCount() > 0 && (
              <Animated.View entering={ZoomIn.duration(200)}>
                <Badge
                  variant="outline"
                  className="bg-primary/5 self-start mt-1"
                >
                  <Label className="text-xs">
                    将扫描 {getPortCount()} 个端口
                  </Label>
                </Badge>
              </Animated.View>
            )}
          </View>
        )}

        {/* 底部操作栏 */}
        <View className="flex-row justify-between items-center pt-2 border-t border-border/30">
          <Text className="text-xs text-muted-foreground">
            {getPortCount() === 0 ? "请设置端口" : `共 ${getPortCount()} 个端口`}
          </Text>
          
          <Button
            variant="ghost"
            size="sm"
            onPress={resetToDefault}
            disabled={disabled}
            className="px-3 py-1"
            accessibilityLabel="重置为默认"
            accessibilityHint="将端口范围重置为默认设置(1-1024)"
          >
            <RotateCw size={14} className="mr-1 text-muted-foreground" />
            <Label className="text-xs text-muted-foreground">重置为默认</Label>
          </Button>
        </View>
      </View>

      {/* 错误显示 */}
      {error && (
        <Animated.View 
          entering={SlideInDown.duration(300)}
          className="flex-row items-center space-x-2 bg-destructive/10 p-2 rounded-lg"
        >
          <AlertCircle size={16} className="text-destructive" />
          <Label className="text-sm text-destructive">{error}</Label>
        </Animated.View>
      )}
    </Animated.View>
  );
};

export default React.memo(PortRangePicker);
