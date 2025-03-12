import React, { useCallback, useMemo } from "react";
import { View } from "react-native";
import { Label } from "~/components/ui/label";
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
  FadeInDown,
  FadeOutUp,
  Layout,
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

const SectionTitle = ({ icon: Icon, title }: { icon: any; title: string }) => (
  <View className="flex-row items-center space-x-3 mb-4">
    <Icon size={20} className="text-primary" />
    <Label className="text-xl font-semibold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
      {title}
    </Label>
  </View>
);

const AdvancedSettings = React.memo(() => {
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
  });

  // 开关动画样式
  const switchStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(isScanning ? 0.9 : 1) }],
    opacity: withSpring(isScanning ? 0.6 : 1),
  }));

  // 表单提交处理
  const onSubmit = useCallback(
    async (data: SettingsForm) => {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        // 应用设置
        setScanSpeed(data.scanSpeed);
        setTimeout(data.timeout);
        setScanMethod(data.scanMethod);
        setShowClosedPorts(data.showClosedPorts);
        setAutoReconnect(data.autoReconnect);
        setNotificationsEnabled(data.notificationsEnabled);

        toast.success("设置已保存", {
          duration: 2000,
          icon: "✨",
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error) {
        toast.error("保存设置失败", {
          duration: 3000,
          icon: "❌",
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    },
    [
      setScanSpeed,
      setTimeout,
      setScanMethod,
      setShowClosedPorts,
      setAutoReconnect,
      setNotificationsEnabled,
    ]
  );

  const scanSpeedOptions = useMemo(
    () => [
      { value: "slow", label: "慢速 (更准确)" },
      { value: "normal", label: "正常" },
      { value: "fast", label: "快速 (可能不准确)" },
    ],
    []
  );

  const scanMethodOptions = useMemo(
    () => [
      { value: "tcp", label: "TCP 连接扫描" },
      { value: "syn", label: "SYN 扫描" },
      { value: "udp", label: "UDP 扫描" },
      { value: "ack", label: "ACK 扫描" },
    ],
    []
  );

  if (isScanning) {
    return (
      <Alert
        icon={AlertCircle}
        variant="destructive"
        className="mx-4 mt-4 rounded-xl border-red-500/50"
      >
        <AlertTitle className="flex-row items-center">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          扫描进行中
        </AlertTitle>
        <AlertDescription className="text-red-400">
          请等待当前扫描完成后再修改设置
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Animated.ScrollView
      className="flex-1"
      contentContainerClassName="px-4 py-6 space-y-6"
      showsVerticalScrollIndicator={false}
    >
      {/* 扫描配置部分 */}
      <Animated.View
        entering={FadeInDown.duration(300).springify()}
        exiting={FadeOutUp.duration(200)}
        layout={Layout.springify()}
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
                render={({ field: { onChange, value } }) => (
                  <Select
                    onValueChange={(value) => {
                      onChange(value as unknown as string);
                      setScanSpeed(value as unknown as string);
                      Haptics.selectionAsync();
                    }}
                    disabled={isScanning}
                    defaultValue={{ value: "normal", label: "正常" }}
                  >
                    <SelectTrigger className="w-full h-12 rounded-xl border-border/50 hover:border-primary/50 transition-colors">
                      <SelectValue
                        className="text-base"
                        placeholder="选择扫描速度"
                      />
                    </SelectTrigger>
                    <SelectContent className="w-full rounded-xl border-border/50">
                      <SelectGroup>
                        {scanSpeedOptions.map((option) => (
                          <SelectItem
                            key={option.value}
                            value={option.value}
                            label={option.label}
                          >
                            {option.label}
                          </SelectItem>
                        ))}
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
                render={({ field: { onChange, value } }) => (
                  <Select
                    onValueChange={(value) => {
                      onChange(value as unknown as string);
                      setScanMethod(value as unknown as string);
                      Haptics.selectionAsync();
                    }}
                    disabled={isScanning}
                    defaultValue={{ value: "tcp", label: "TCP 连接扫描" }}
                  >
                    <SelectTrigger className="w-full h-12 rounded-xl border-border/50 hover:border-primary/50 transition-colors">
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
                        {scanMethodOptions.map((option) => (
                          <SelectItem
                            key={option.value}
                            value={option.value}
                            label={option.label}
                          >
                            {option.label}
                          </SelectItem>
                        ))}
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
                render={({ field: { onChange, value } }) => (
                  <Input
                    value={value.toString()}
                    onChangeText={(text) => {
                      const num = parseInt(text) || 500;
                      onChange(num);
                      setTimeout(num);
                    }}
                    keyboardType="numeric"
                    className="w-full h-12 rounded-xl border-border/50 hover:border-primary/50 transition-colors"
                    editable={!isScanning}
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
                render={({ field: { onChange, value } }) => (
                  <AnimatedSwitch
                    value={value}
                    onValueChange={(value) => {
                      onChange(value);
                      setShowClosedPorts(value);
                      Haptics.selectionAsync();
                    }}
                    disabled={isScanning}
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
                render={({ field: { onChange, value } }) => (
                  <AnimatedSwitch
                    value={value}
                    onValueChange={(value) => {
                      onChange(value);
                      setAutoReconnect(value);
                      Haptics.selectionAsync();
                    }}
                    disabled={isScanning}
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
                render={({ field: { onChange, value } }) => (
                  <AnimatedSwitch
                    value={value}
                    onValueChange={(value) => {
                      onChange(value);
                      setNotificationsEnabled(value);
                      Haptics.selectionAsync();
                    }}
                    disabled={isScanning}
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
              保存设置
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
});

AdvancedSettings.displayName = "AdvancedSettings";

export default AdvancedSettings;
