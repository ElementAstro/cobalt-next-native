import React, { useCallback, useMemo, useEffect, useState } from "react";
import { View } from "react-native";
import { Label } from "~/components/ui/label";
import type { Option as SelectOption } from "~/components/ui/select";
import {
  Zap,
  Bell,
  RefreshCcw,
  AlertCircle,
  Settings2,
  ChevronRight,
  Loader2,
} from "lucide-react-native";
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withDelay,
  FadeInDown,
  FadeOutUp,
  FadeIn,
  useSharedValue,
  interpolate,
  interpolateColor,
  withSequence,
  LinearTransition,
} from "react-native-reanimated";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Input } from "~/components/ui/input";
import * as Haptics from "expo-haptics";
import { Switch } from "react-native";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner-native";
import { Button } from "~/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "~/components/ui/alert";
import useScannerStore from "~/stores/useScannerStore";

// 定义 SettingsForm 接口
interface SettingsForm {
  scanSpeed: "slow" | "normal" | "fast";
  timeout: number;
  scanMethod: "tcp" | "syn" | "udp" | "ack";
  showClosedPorts: boolean;
  autoReconnect: boolean;
  notificationsEnabled: boolean;
}

// 增强的 Zod schema
const settingsSchema = z.object({
  scanSpeed: z.enum(["slow", "normal", "fast"], {
    required_error: "请选择扫描速度",
  }),
  timeout: z
    .number()
    .min(100, "超时时间不能小于 100ms")
    .max(5000, "超时时间不能超过 5000ms"),
  scanMethod: z.enum(["tcp", "syn", "udp", "ack"], {
    required_error: "请选择扫描方式",
  }),
  showClosedPorts: z.boolean(),
  autoReconnect: z.boolean(),
  notificationsEnabled: z.boolean(),
});

const AnimatedSwitch = Animated.createAnimatedComponent(Switch);

const SectionTitle = React.memo(
  ({ icon: Icon, title }: { icon: any; title: string }) => {
    const scale = useSharedValue(1);
    const textGradient = useSharedValue(0);

    useEffect(() => {
      scale.value = withSpring(1, { mass: 0.5, damping: 12 });
      textGradient.value = withTiming(1, { duration: 1000 });
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    const textStyle = useAnimatedStyle(() => ({
      opacity: interpolate(textGradient.value, [0, 1], [0.7, 1]),
    }));

    return (
      <Animated.View
        entering={FadeInDown.duration(400).springify()}
        layout={LinearTransition.springify()}
        className="flex-row items-center space-x-3 mb-4"
        style={animatedStyle}
      >
        <Icon size={20} className="text-primary" />
        <Animated.View style={textStyle}>
          <Label
            className="text-xl font-semibold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent"
            accessibilityRole="header"
            accessibilityLabel={title}
            accessibilityHint={`${title}设置区域标题`}
            importantForAccessibility="yes"
          >
            {title}
          </Label>
        </Animated.View>
      </Animated.View>
    );
  }
);

SectionTitle.displayName = "SectionTitle";

// 骨架屏组件
const SettingsSkeleton = () => {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(withTiming(1, { duration: 1500 }), -1, true);
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      shimmer.value,
      [0, 0.5, 1],
      [
        "hsl(var(--muted) / 0.1)",
        "hsl(var(--muted) / 0.2)",
        "hsl(var(--muted) / 0.1)",
      ]
    ),
  }));

  const ShimmerBlock = ({
    width,
    height,
    delay,
  }: {
    width: string;
    height: number;
    delay: number;
  }) => {
    const opacity = useSharedValue(0);

    useEffect(() => {
      opacity.value = withDelay(delay, withTiming(1, { duration: 500 }));
    }, []);

    const blockStyle = useAnimatedStyle(() => ({
      opacity: opacity.value,
      transform: [
        {
          translateX: interpolate(shimmer.value, [0, 1], [-20, 20]),
        },
      ],
    }));

    return (
      <Animated.View
        style={[shimmerStyle, blockStyle]}
        className={`${width} h-${height} rounded-xl overflow-hidden`}
      />
    );
  };

  return (
    <Animated.View
      entering={FadeIn.duration(300).springify()}
      className="space-y-6 p-4"
      accessible={true}
      accessibilityLabel="加载中..."
      accessibilityHint="正在加载设置界面"
    >
      <ShimmerBlock width="w-3/4" height={8} delay={0} />
      <View className="space-y-4">
        <ShimmerBlock width="w-full" height={12} delay={100} />
        <ShimmerBlock width="w-full" height={12} delay={200} />
        <ShimmerBlock width="w-full" height={12} delay={300} />
      </View>
      <View className="space-y-4">
        <ShimmerBlock width="w-1/2" height={8} delay={400} />
        <View className="space-y-3">
          <ShimmerBlock width="w-full" height={10} delay={500} />
          <ShimmerBlock width="w-full" height={10} delay={600} />
          <ShimmerBlock width="w-full" height={10} delay={700} />
        </View>
      </View>
    </Animated.View>
  );
};

interface AdvancedSettingsProps {
  isLoading?: boolean;
}

const AdvancedSettings = React.memo<AdvancedSettingsProps>(
  ({ isLoading = false }) => {
    const {
      scanSpeed,
      timeout,
      showClosedPorts,
      scanMethod,
      autoReconnect,
      notificationsEnabled,
      isScanning,
      setScanSpeed,
      setTimeout,
      setShowClosedPorts,
      setScanMethod,
      setAutoReconnect,
      setNotificationsEnabled,
    } = useScannerStore();

    const {
      control,
      handleSubmit,
      formState: { errors, isDirty },
      reset,
      trigger,
    } = useForm<SettingsForm>({
      resolver: zodResolver(settingsSchema),
      defaultValues: {
        scanSpeed: scanSpeed as "slow" | "normal" | "fast",
        timeout,
        scanMethod: scanMethod as "tcp" | "syn" | "udp" | "ack",
        showClosedPorts,
        autoReconnect,
        notificationsEnabled,
      },
      mode: "onChange",
      reValidateMode: "onChange",
    });

    // 重置表单到默认值
    const handleReset = useCallback(() => {
      reset({
        scanSpeed: "normal",
        timeout: 1000,
        scanMethod: "tcp",
        showClosedPorts: false,
        autoReconnect: true,
        notificationsEnabled: true,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.info("已重置为默认设置", { duration: 2000 });
    }, [reset]);

    // 监听外部值变化
    useEffect(() => {
      reset({
        scanSpeed: scanSpeed as "slow" | "normal" | "fast",
        timeout,
        scanMethod: scanMethod as "tcp" | "syn" | "udp" | "ack",
        showClosedPorts,
        autoReconnect,
        notificationsEnabled,
      });
    }, [
      reset,
      scanSpeed,
      timeout,
      scanMethod,
      showClosedPorts,
      autoReconnect,
      notificationsEnabled,
    ]);

    // 自动校验
    useEffect(() => {
      if (isDirty) {
        trigger();
      }
    }, [isDirty, trigger]);

    // 开关动画样式
    const switchStyle = useAnimatedStyle(() => ({
      transform: [{ scale: withSpring(isScanning ? 0.9 : 1) }],
      opacity: withSpring(isScanning ? 0.6 : 1),
    }));

    // 表单提交处理
    const [submitInProgress, setSubmitInProgress] = useState(false);
    const submitAnimation = useSharedValue(0);

    const onSubmit = useCallback(
      async (data: SettingsForm) => {
        try {
          setSubmitInProgress(true);
          submitAnimation.value = withSpring(1);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

          // 验证数据
          const validationResult = settingsSchema.safeParse(data);
          if (!validationResult.success) {
            throw new Error(validationResult.error.message);
          }

          // 并行应用设置以提升性能
          await Promise.all([
            (async () => {
              setScanSpeed(data.scanSpeed);
              await new Promise((resolve) => global.setTimeout(resolve, 100));
            })(),
            (async () => {
              setTimeout(data.timeout);
              await new Promise((resolve) => global.setTimeout(resolve, 100));
            })(),
            (async () => {
              setScanMethod(data.scanMethod);
              await new Promise((resolve) => global.setTimeout(resolve, 100));
            })(),
            setShowClosedPorts(data.showClosedPorts),
            setAutoReconnect(data.autoReconnect),
            setNotificationsEnabled(data.notificationsEnabled),
          ]);

          submitAnimation.value = withSequence(withSpring(1.1), withSpring(1));

          toast.success("设置已保存", {
            duration: 2000,
            icon: "✨",
            action: {
              label: "撤销",
              onClick: handleReset,
            },
          });

          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
          submitAnimation.value = withSequence(withSpring(0.95), withSpring(1));

          toast.error("保存设置失败", {
            duration: 3000,
            icon: "❌",
            description: error instanceof Error ? error.message : "未知错误",
          });

          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
          setSubmitInProgress(false);
          submitAnimation.value = withSpring(0);
        }
      },
      [
        setScanSpeed,
        setTimeout,
        setScanMethod,
        setShowClosedPorts,
        setAutoReconnect,
        setNotificationsEnabled,
        handleReset,
        submitAnimation,
      ]
    );

    const scanSpeedOptions = useMemo<SelectOption[]>(
      () => [
        { value: "slow", label: "慢速 (更准确)" },
        { value: "normal", label: "正常" },
        { value: "fast", label: "快速 (可能不准确)" },
      ],
      []
    );

    const scanMethodOptions = useMemo<SelectOption[]>(
      () => [
        { value: "tcp", label: "TCP 连接扫描" },
        { value: "syn", label: "SYN 扫描" },
        { value: "udp", label: "UDP 扫描" },
        { value: "ack", label: "ACK 扫描" },
      ],
      []
    );

    if (isLoading) {
      return <SettingsSkeleton />;
    }

    if (isScanning) {
      return (
        <Animated.View
          entering={FadeInDown.duration(300).springify()}
          exiting={FadeOutUp.duration(200)}
          className="p-4"
        >
          <Alert
            icon={AlertCircle}
            variant="destructive"
            className="rounded-xl border-red-500/50"
            accessibilityRole="alert"
            accessibilityLabel="扫描进行中，无法修改设置"
          >
            <AlertTitle className="flex-row items-center">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              扫描进行中
            </AlertTitle>
            <AlertDescription className="text-red-400">
              请等待当前扫描完成后再修改设置
            </AlertDescription>
          </Alert>
        </Animated.View>
      );
    }

    return (
      <Animated.ScrollView
        className="flex-1"
        contentContainerClassName="px-4 py-6 space-y-6"
        showsVerticalScrollIndicator={false}
        accessible={true}
        accessibilityLabel="高级扫描设置"
        accessibilityHint="包含扫描速度、方式、超时等配置项"
      >
        {/* 扫描配置部分 */}
        <Animated.View
          entering={FadeInDown.duration(300).springify()}
          exiting={FadeOutUp.duration(200)}
          layout={LinearTransition.springify()}
          className="space-y-6"
        >
          <View className="space-y-4">
            <SectionTitle icon={Settings2} title="扫描配置" />
            <View className="space-y-6 bg-card/80 backdrop-blur-lg p-5 rounded-2xl border border-border/50 shadow-lg">
              {/* 扫描速度设置 */}
              <View className="space-y-3">
                <View className="flex-row items-center justify-between">
                  <Label className="text-base font-medium">扫描速度</Label>
                  {errors.scanSpeed && (
                    <View className="flex-row items-center space-x-1">
                      <AlertCircle size={16} className="text-destructive" />
                      <Label className="text-xs text-destructive">
                        {errors.scanSpeed.message}
                      </Label>
                    </View>
                  )}
                </View>
                <Controller
                  control={control}
                  name="scanSpeed"
                  render={({ field }) => (
                    <Select
                      onValueChange={(option: SelectOption | undefined) => {
                        if (option) {
                          field.onChange(option.value);
                          setScanSpeed(option.value);
                          Haptics.selectionAsync();
                          if (option.label) {
                            toast.success(`已设置扫描速度: ${option.label}`, {
                              duration: 1500,
                            });
                          }
                        }
                      }}
                      disabled={isScanning}
                      defaultValue={
                        scanSpeedOptions.find(
                          (opt) => opt?.value === field.value
                        ) ??
                        ({
                          value: "normal",
                          label: "正常",
                        } as SelectOption)
                      }
                    >
                      <SelectTrigger
                        className="w-full h-12 rounded-xl border-border/50 hover:border-primary/50 transition-colors"
                        accessibilityRole="button"
                        accessibilityLabel="选择扫描速度"
                        accessibilityHint="点击打开扫描速度选择列表"
                      >
                        <SelectValue
                          className="text-base"
                          placeholder="选择扫描速度"
                        />
                      </SelectTrigger>
                      <SelectContent className="w-full rounded-xl border-border/50">
                        <SelectGroup>
                          {scanSpeedOptions.map(
                            (option) =>
                              option && (
                                <SelectItem
                                  key={option.value ?? ""}
                                  value={option.value ?? ""}
                                  label={option.label ?? "选项"}
                                >
                                  {option.label ?? "选项"}
                                </SelectItem>
                              )
                          )}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  )}
                />
              </View>

              {/* 扫描方式设置 */}
              <View className="space-y-3">
                <View className="flex-row items-center justify-between">
                  <Label className="text-base font-medium">扫描方式</Label>
                  {errors.scanMethod && (
                    <View className="flex-row items-center space-x-1">
                      <AlertCircle size={16} className="text-destructive" />
                      <Label className="text-xs text-destructive">
                        {errors.scanMethod.message}
                      </Label>
                    </View>
                  )}
                </View>
                <Controller
                  control={control}
                  name="scanMethod"
                  render={({ field }) => (
                    <Select
                      onValueChange={(option: SelectOption | undefined) => {
                        if (option) {
                          field.onChange(option.value);
                          setScanMethod(option.value);
                          Haptics.selectionAsync();
                          toast.success(`已设置扫描方式: ${option.label}`, {
                            duration: 1500,
                          });
                        }
                      }}
                      disabled={isScanning}
                      defaultValue={
                        scanMethodOptions.find(
                          (opt) => opt?.value === field.value
                        ) ??
                        ({
                          value: "tcp",
                          label: "TCP 连接扫描",
                        } as SelectOption)
                      }
                    >
                      <SelectTrigger
                        className="w-full h-12 rounded-xl border-border/50 hover:border-primary/50 transition-colors"
                        accessibilityRole="button"
                        accessibilityLabel="选择扫描方式"
                        accessibilityHint="点击打开扫描方式选择列表"
                      >
                        <SelectValue
                          className="text-base"
                          placeholder="选择扫描方式"
                        />
                      </SelectTrigger>
                      <SelectContent
                        className="w-full rounded-xl border-border/50"
                        insets={{
                          top: 0,
                          bottom: 0,
                          left: 16,
                          right: 16,
                        }}
                      >
                        <SelectGroup>
                          <SelectLabel>扫描方式</SelectLabel>
                          {scanMethodOptions.map(
                            (option) =>
                              option && (
                                <SelectItem
                                  key={option.value ?? ""}
                                  value={option.value ?? ""}
                                  label={option.label ?? "选项"}
                                >
                                  {option.label ?? "选项"}
                                </SelectItem>
                              )
                          )}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  )}
                />
              </View>

              {/* 超时设置 */}
              <View className="space-y-3">
                <View className="flex-row items-center justify-between">
                  <Label className="text-base font-medium">超时时间 (ms)</Label>
                  {errors.timeout && (
                    <View className="flex-row items-center space-x-1">
                      <AlertCircle size={16} className="text-destructive" />
                      <Label className="text-xs text-destructive">
                        {errors.timeout.message}
                      </Label>
                    </View>
                  )}
                </View>
                <Controller
                  control={control}
                  name="timeout"
                  render={({ field }) => (
                    <Input
                      value={field.value.toString()}
                      onChangeText={(text) => {
                        const num = parseInt(text) || 500;
                        field.onChange(num);
                        setTimeout(num);
                        Haptics.selectionAsync();
                      }}
                      onBlur={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        toast.info(`超时时间已设置为 ${field.value}ms`, {
                          duration: 1500,
                        });
                      }}
                      keyboardType="numeric"
                      className="w-full h-12 rounded-xl border-border/50 hover:border-primary/50 transition-colors"
                      editable={!isScanning}
                      accessibilityLabel="超时时间设置"
                      accessibilityHint={`当前值为 ${field.value} 毫秒，可输入 100 到 5000 之间的数值`}
                      placeholder="输入超时时间（毫秒）"
                      maxLength={4}
                    />
                  )}
                />
              </View>
            </View>
          </View>

          {/* 高级选项部分 */}
          <View className="space-y-4">
            <SectionTitle icon={Zap} title="高级选项" />
            <Animated.View
              style={switchStyle}
              className="space-y-6 bg-card/80 backdrop-blur-lg p-5 rounded-2xl border border-border/50 shadow-lg"
            >
              {/* 显示关闭的端口 */}
              <View className="flex-row justify-between items-center">
                <View className="flex-row items-center space-x-3">
                  <Zap size={22} className="text-primary" />
                  <Label className="text-base">显示关闭的端口</Label>
                </View>
                <Controller
                  control={control}
                  name="showClosedPorts"
                  render={({ field }) => (
                    <AnimatedSwitch
                      value={field.value}
                      onValueChange={(newValue) => {
                        field.onChange(newValue);
                        setShowClosedPorts(newValue);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        toast.success(
                          `${newValue ? "已启用" : "已关闭"}显示关闭的端口`,
                          {
                            duration: 1500,
                          }
                        );
                      }}
                      disabled={isScanning}
                      accessibilityRole="switch"
                      accessibilityLabel="显示关闭的端口"
                      accessibilityState={{
                        checked: field.value,
                        disabled: isScanning,
                      }}
                      className="transform transition-transform"
                    />
                  )}
                />
              </View>

              {/* 自动重试连接 */}
              <View className="flex-row justify-between items-center">
                <View className="flex-row items-center space-x-3">
                  <RefreshCcw size={22} className="text-primary" />
                  <Label className="text-base">自动重试连接</Label>
                </View>
                <Controller
                  control={control}
                  name="autoReconnect"
                  render={({ field }) => (
                    <AnimatedSwitch
                      value={field.value}
                      onValueChange={(newValue) => {
                        field.onChange(newValue);
                        setAutoReconnect(newValue);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        toast.success(
                          `${newValue ? "已启用" : "已关闭"}自动重连`,
                          {
                            duration: 1500,
                          }
                        );
                      }}
                      disabled={isScanning}
                      accessibilityRole="switch"
                      accessibilityLabel="自动重试连接"
                      accessibilityState={{
                        checked: field.value,
                        disabled: isScanning,
                      }}
                      className="transform transition-transform"
                    />
                  )}
                />
              </View>

              {/* 启用通知 */}
              <View className="flex-row justify-between items-center">
                <View className="flex-row items-center space-x-3">
                  <Bell size={22} className="text-primary" />
                  <Label className="text-base">启用通知</Label>
                </View>
                <Controller
                  control={control}
                  name="notificationsEnabled"
                  render={({ field }) => (
                    <AnimatedSwitch
                      value={field.value}
                      onValueChange={(newValue) => {
                        field.onChange(newValue);
                        setNotificationsEnabled(newValue);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        toast.success(
                          `${newValue ? "已启用" : "已关闭"}通知提醒`,
                          {
                            duration: 1500,
                          }
                        );
                      }}
                      disabled={isScanning}
                      accessibilityRole="switch"
                      accessibilityLabel="启用通知提醒"
                      accessibilityState={{
                        checked: field.value,
                        disabled: isScanning,
                      }}
                      className="transform transition-transform"
                    />
                  )}
                />
              </View>
            </Animated.View>
          </View>

          {/* 提交按钮 */}
          <Button
            variant={isDirty ? "default" : "secondary"}
            onPress={handleSubmit(onSubmit)}
            disabled={submitInProgress}
            className={`
            w-full h-14 rounded-full shadow-lg
            ${
              isDirty
                ? "bg-gradient-to-r from-primary to-primary/80"
                : "bg-muted/50"
            }
          `}
          >
            <View className="flex-row items-center justify-center space-x-2">
              <Settings2
                size={20}
                className={isDirty ? "text-white" : "text-foreground"}
              />
              <Label
                className={`text-base font-medium ${
                  isDirty ? "text-white" : "text-foreground"
                }`}
              >
                {submitInProgress ? "保存中..." : "保存设置"}
              </Label>
              <ChevronRight
                size={18}
                className={isDirty ? "text-white" : "text-foreground"}
              />
            </View>
          </Button>
        </Animated.View>
      </Animated.ScrollView>
    );
  }
);

AdvancedSettings.displayName = "AdvancedSettings";

export default AdvancedSettings;
