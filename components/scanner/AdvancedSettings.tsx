import React from "react";
import { View } from "react-native";
import { Label } from "@/components/ui/label";
import { Zap, Bell, RefreshCcw, AlertCircle } from "lucide-react-native";
import Animated from "react-native-reanimated";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Option } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import * as Haptics from "expo-haptics";
import { Switch } from "react-native";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

// Zod schema for validation
const settingsSchema = z.object({
  scanSpeed: z.enum(["slow", "normal", "fast"]),
  timeout: z.number().min(100).max(5000),
  scanMethod: z.enum(["tcp", "syn", "udp", "ack"]),
  showClosedPorts: z.boolean(),
  autoReconnect: z.boolean(),
  notificationsEnabled: z.boolean()
});

type SettingsForm = z.infer<typeof settingsSchema>;

interface AdvancedSettingsProps {
  scanSpeed: string;
  setScanSpeed: (value: string) => void;
  timeout: number;
  setTimeoutValue: (value: number) => void;
  showClosedPorts: boolean;
  setShowClosedPorts: (value: boolean) => void;
  scanMethod: string;
  setScanMethod: (value: string) => void;
  autoReconnect: boolean;
  setAutoReconnect: (value: boolean) => void;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (value: boolean) => void;
  isScanning: boolean;
}

const AnimatedSwitch = Animated.createAnimatedComponent(Switch);

const AdvancedSettings: React.FC<AdvancedSettingsProps> = ({
  scanSpeed,
  setScanSpeed,
  timeout,
  setTimeoutValue,
  showClosedPorts,
  setShowClosedPorts,
  scanMethod,
  setScanMethod,
  autoReconnect,
  setAutoReconnect,
  notificationsEnabled,
  setNotificationsEnabled,
  isScanning,
}) => {
  const { control, handleSubmit, formState: { errors } } = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      scanSpeed: scanSpeed as "slow" | "normal" | "fast",
      timeout,
      scanMethod: scanMethod as "tcp" | "syn" | "udp" | "ack",
      showClosedPorts,
      autoReconnect,
      notificationsEnabled
    }
  });

  return (
    <View className="space-y-6">
      {/* 扫描速度设置 */}
      <View className="space-y-2">
        <View className="flex-row items-center space-x-2">
          <Label className="text-base">扫描速度</Label>
          {errors.scanSpeed && <AlertCircle size={16} className="text-red-500" />}
        </View>
        <Controller
          control={control}
          name="scanSpeed"
          render={({ field: { onChange, value } }) => (
            <Select
              value={value as unknown as Option}
              onValueChange={(value: Option) => {
                onChange(value as unknown as string);
                setScanSpeed(value as unknown as string);
                Haptics.selectionAsync();
              }}
              disabled={isScanning}
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
          <Label className="text-red-500 text-sm">{errors.scanSpeed.message}</Label>
        )}
      </View>

      {/* 扫描方式设置 */}
      <View className="space-y-2">
        <View className="flex-row items-center space-x-2">
          <Label className="text-base">扫描方式</Label>
          {errors.scanMethod && <AlertCircle size={16} className="text-red-500" />}
        </View>
        <Controller
          control={control}
          name="scanMethod"
          render={({ field: { onChange, value } }) => (
            <Select
              value={value as unknown as Option}
              onValueChange={(value: Option) => {
                onChange(value as unknown as string);
                setScanMethod(value as unknown as string);
                Haptics.selectionAsync();
              }}
              disabled={isScanning}
            >
              <SelectTrigger className="border border-gray-300 rounded-md p-2">
                <SelectValue placeholder="选择扫描方式" />
              </SelectTrigger>
              <SelectContent className="bg-white rounded-md shadow-lg">
                <SelectGroup>
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
          <Label className="text-red-500 text-sm">{errors.scanMethod.message}</Label>
        )}
      </View>

      {/* 超时时间设置 */}
      <View className="space-y-2">
        <View className="flex-row items-center space-x-2">
          <Label>超时时间 (ms)</Label>
          {errors.timeout && <AlertCircle size={16} className="text-red-500" />}
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
                setTimeoutValue(num);
              }}
              keyboardType="numeric"
              className="w-full border border-gray-300 rounded-md p-2"
              editable={!isScanning}
            />
          )}
        />
        {errors.timeout && (
          <Label className="text-red-500 text-sm">{errors.timeout.message}</Label>
        )}
      </View>

      {/* 开关设置 */}
      <View className="space-y-4">
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
      </View>
    </View>
  );
};

export default React.memo(AdvancedSettings);
