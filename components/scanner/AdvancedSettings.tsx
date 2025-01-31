import React, { useCallback } from "react";
import { View } from "react-native";
import { Label } from "@/components/ui/label";
import {
  Zap,
  Bell,
  RefreshCcw,
  AlertCircle,
  Settings2,
  ChevronRight,
} from "lucide-react-native";
import Animated, {
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import * as Haptics from "expo-haptics";
import { Switch } from "react-native";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner-native";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import useScannerStore from "@/stores/useScannerStore";

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
  <View className="flex-row items-center space-x-2 mb-2">
    <Icon size={18} className="text-primary" />
    <Label className="text-lg font-semibold">{title}</Label>
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
    setNotificationsEnabled
  } = useScannerStore();

  const {
    control,
    handleSubmit,
    formState: { errors },
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
  const onSubmit = useCallback((data: SettingsForm) => {
    try {
      // 应用设置
      setScanSpeed(data.scanSpeed);
      setTimeout(data.timeout);
      setScanMethod(data.scanMethod);
      setShowClosedPorts(data.showClosedPorts);
      setAutoReconnect(data.autoReconnect);
      setNotificationsEnabled(data.notificationsEnabled);

      toast.success("设置已保存");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      toast.error("保存设置失败");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, []);

  if (isScanning) {
    return (
      <Alert icon={AlertCircle} variant="destructive">
        <AlertTitle>扫描进行中</AlertTitle>
        <AlertDescription>请等待当前扫描完成后再修改设置</AlertDescription>
      </Alert>
    );
  }

  return (
    <View className="space-y-8">
      {/* 扫描配置部分 */}
      <View>
        <SectionTitle icon={Settings2} title="扫描配置" />
        <View className="space-y-4 bg-card p-4 rounded-lg">
          {/* 扫描速度设置 */}
          <View className="space-y-2">
            <View className="flex-row items-center space-x-2">
              <Label className="text-base">扫描速度</Label>
              {errors.scanSpeed && (
                <AlertCircle size={16} className="text-red-500" />
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
                  <SelectTrigger className="border border-gray-300 rounded-md p-2">
                    <SelectValue placeholder="选择扫描速度" />
                  </SelectTrigger>
                  <SelectContent className="bg-white rounded-md shadow-lg">
                    <SelectGroup>
                      <SelectItem value="slow" label="慢速 (更准确)">
                        慢速 (更准确)
                      </SelectItem>
                      <SelectItem value="normal" label="正常">
                        正常
                      </SelectItem>
                      <SelectItem value="fast" label="快速 (可能不准确)">
                        快速 (可能不准确)
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.scanSpeed && (
              <Label className="text-red-500 text-sm">
                {errors.scanSpeed.message}
              </Label>
            )}
          </View>

          {/* 扫描方式设置 */}
          <View className="space-y-2 w-full">
            <View className="flex-row items-center space-x-2">
              <Label className="text-base">扫描方式</Label>
              {errors.scanMethod && (
                <AlertCircle size={16} className="text-red-500" />
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
                  <SelectTrigger className="w-[250px]">
                    <SelectValue
                      className="text-foreground text-sm native:text-lg"
                      placeholder="选择扫描方式"
                    />
                  </SelectTrigger>
                  <SelectContent
                    className="w-[250px]"
                    insets={{
                      top: 0,
                      bottom: 0,
                      left: 12,
                      right: 12,
                    }}
                  >
                    <SelectGroup>
                      <SelectLabel>扫描方式</SelectLabel>
                      <SelectItem value="tcp" label="TCP 连接扫描">
                        TCP 连接扫描
                      </SelectItem>
                      <SelectItem value="syn" label="SYN 扫描">
                        SYN 扫描
                      </SelectItem>
                      <SelectItem value="udp" label="UDP 扫描">
                        UDP 扫描
                      </SelectItem>
                      <SelectItem value="ack" label="ACK 扫描">
                        ACK 扫描
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.scanMethod && (
              <Label className="text-red-500 text-sm">
                {errors.scanMethod.message}
              </Label>
            )}
          </View>

          {/* 超时设置 */}
          <View className="space-y-2">
            <View className="flex-row items-center space-x-2">
              <Label>超时时间 (ms)</Label>
              {errors.timeout && (
                <AlertCircle size={16} className="text-red-500" />
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
                  className="w-full border border-gray-300 rounded-md p-2"
                  editable={!isScanning}
                />
              )}
            />
            {errors.timeout && (
              <Label className="text-red-500 text-sm">
                {errors.timeout.message}
              </Label>
            )}
          </View>
        </View>
      </View>

      {/* 高级选项部分 */}
      <View>
        <SectionTitle icon={Zap} title="高级选项" />
        <View className="space-y-4 bg-card p-4 rounded-lg">
          {/* 开关设置组 */}
          <Animated.View style={switchStyle}>
            {/* 显示关闭的端口 */}
            <View className="flex-row justify-between items-center">
              <View className="flex-row items-center space-x-2">
                <Zap size={20} className="text-blue-500" />
                <Label>显示关闭的端口</Label>
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
              <View className="flex-row items-center space-x-2">
                <RefreshCcw size={20} className="text-blue-500" />
                <Label>自动重试连接</Label>
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
              <View className="flex-row items-center space-x-2">
                <Bell size={20} className="text-blue-500" />
                <Label>启用通知</Label>
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
      </View>

      {/* 提交按钮 */}
      <Button
        variant="default"
        onPress={handleSubmit(onSubmit)}
        className="mt-4"
      >
        保存设置
        <ChevronRight size={16} className="ml-2" />
      </Button>
    </View>
  );
});

AdvancedSettings.displayName = "AdvancedSettings";

export default AdvancedSettings;
