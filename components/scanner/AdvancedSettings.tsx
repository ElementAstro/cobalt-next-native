import React from "react";
import { View } from "react-native";
import { Label } from "@/components/ui/label";
import { Zap, Bell, RefreshCcw } from "lucide-react-native";
import Animated, { withSpring } from "react-native-reanimated";
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
  return (
    <View className="space-y-6">
      {/* 扫描速度设置 */}
      <View className="space-y-2">
        <Label className="text-base">扫描速度</Label>
        <Select
          value={scanSpeed as unknown as Option}
          onValueChange={(value: Option) => {
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
      </View>

      {/* 扫描方式设置 */}
      <View className="space-y-2">
        <Label className="text-base">扫描方式</Label>
        <Select
          value={scanMethod as unknown as Option}
          onValueChange={(value: Option) => {
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
      </View>

      {/* 超时时间设置 */}
      <View className="flex-row justify-between items-center">
        <Label>超时时间 (ms)</Label>
        <Input
          value={timeout.toString()}
          onChangeText={(text) => setTimeoutValue(parseInt(text) || 500)}
          keyboardType="numeric"
          className="w-24 text-right border border-gray-300 rounded-md p-2"
          editable={!isScanning}
        />
      </View>

      {/* 开关设置 */}
      <View className="space-y-4">
        {/* 显示关闭的端口 */}
        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center space-x-2">
            <Zap size={20} className="text-blue-500" />
            <Label>显示关闭的端口</Label>
          </View>
          <AnimatedSwitch
            value={showClosedPorts}
            onValueChange={(value) => {
              setShowClosedPorts(value);
              Haptics.selectionAsync();
            }}
            disabled={isScanning}
            className="transform transition-transform"
            style={{
              transform: [
                {
                  scale: withSpring(isScanning ? 1 : 1),
                },
              ],
            }}
          />
        </View>

        {/* 自动重试连接 */}
        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center space-x-2">
            <RefreshCcw size={20} className="text-blue-500" />
            <Label>自动重试连接</Label>
          </View>
          <AnimatedSwitch
            value={autoReconnect}
            onValueChange={(value) => {
              setAutoReconnect(value);
              Haptics.selectionAsync();
            }}
            disabled={isScanning}
            className="transform transition-transform"
          />
        </View>

        {/* 启用通知 */}
        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center space-x-2">
            <Bell size={20} className="text-blue-500" />
            <Label>启用通知</Label>
          </View>
          <AnimatedSwitch
            value={notificationsEnabled}
            onValueChange={(value) => {
              setNotificationsEnabled(value);
              Haptics.selectionAsync();
            }}
            disabled={isScanning}
            className="transform transition-transform"
          />
        </View>
      </View>
    </View>
  );
};

export default React.memo(AdvancedSettings);
