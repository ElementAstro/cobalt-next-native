import React, { useState, useEffect, useCallback } from "react";
import { View, ScrollView, TouchableOpacity } from "react-native";
import useDownloadStore from "../../stores/useDownloadStore";
import Slider from "@react-native-community/slider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Text } from "../ui/text"; 
import { Card, CardContent } from "../ui/card";
import { 
  FileDown, Clock, Shield, FolderTree, Save, X, 
  RefreshCw, Sliders, Download, Wifi, Server, CheckCircle
} from "lucide-react-native";
import Animated, { 
  FadeIn, FadeInUp, SlideInRight, 
  ZoomIn, useAnimatedStyle, withTiming, 
  withSpring, FadeOut 
} from "react-native-reanimated";
import { Alert, AlertTitle, AlertDescription } from "../ui/alert";
import type { DownloadSettings as DownloadSettingsType } from "./types";

interface DownloadSettingsProps {
  visible: boolean;
  onClose: () => void;
}

const DownloadSettingsComponent: React.FC<DownloadSettingsProps> = ({
  visible,
  onClose,
}) => {
  const settings = useDownloadStore((state) => state.settings);
  const updateSettings = useDownloadStore((state) => state.updateSettings);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");

  // 本地状态用于表单
  const [formState, setFormState] = useState<DownloadSettingsType>(settings);

  // 当设置变更时更新本地状态
  useEffect(() => {
    setFormState(settings);
  }, [settings]);

  // 表单值更改处理器
  const updateFormState = useCallback((key: keyof DownloadSettingsType, value: any) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
    setUnsavedChanges(true);
  }, []);

  const handleSaveSettings = useCallback(() => {
    updateSettings(formState);
    setShowSuccess(true);
    setUnsavedChanges(false);
    
    setTimeout(() => {
      setShowSuccess(false);
    }, 3000);
  }, [formState, updateSettings]);

  const handleMaxDownloadsChange = useCallback((value: number) => {
    updateFormState("maxConcurrentDownloads", value);
  }, [updateFormState]);

  const handleAutoResumeChange = useCallback((value: boolean) => {
    updateFormState("autoResumeOnConnection", value);
  }, [updateFormState]);

  const handleMaxFileSizeChange = useCallback((value: number) => {
    updateFormState("maxFileSize", value * 1024 * 1024); // Convert bytes to MB
  }, [updateFormState]);

  const handleAllowedFileTypesChange = useCallback((value: string) => {
    const types = value.split(",").map((t: string) => t.trim());
    updateFormState("allowedFileTypes", types);
  }, [updateFormState]);

  const handleBandwidthLimitChange = useCallback((value: number) => {
    updateFormState("bandwidthLimit", value);
  }, [updateFormState]);

  const renderTab = useCallback(() => {
    switch (activeTab) {
      case "basic":
        return (
          <Animated.View 
            entering={FadeIn.duration(300)} 
            exiting={FadeOut.duration(200)}
            className="space-y-6"
          >
            <Card className="border-border">
              <CardContent className="p-4">
                <View className="flex-row items-center space-x-2 mb-4">
                  <Download size={20} className="text-primary" />
                  <Text className="text-lg font-medium">基本设置</Text>
                </View>

                <View className="space-y-4">
                  <Label>最大同时下载数</Label>
                  <View className="flex-row items-center space-x-2">
                    <Slider
                      value={formState.maxConcurrentDownloads}
                      onValueChange={handleMaxDownloadsChange}
                      minimumValue={1}
                      maximumValue={5}
                      step={1}
                      minimumTrackTintColor="#3b82f6"
                      maximumTrackTintColor="#d1d5db"
                      className="flex-1"
                    />
                    <Badge variant="secondary">
                      {formState.maxConcurrentDownloads}
                    </Badge>
                  </View>
                </View>

                <View className="flex-row justify-between items-center mt-4">
                  <Label>网络恢复时自动继续下载</Label>
                  <Switch
                    checked={formState.autoResumeOnConnection}
                    onCheckedChange={handleAutoResumeChange}
                  />
                </View>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="p-4">
                <View className="flex-row items-center space-x-2 mb-4">
                  <Shield size={20} className="text-primary" />
                  <Text className="text-lg font-medium">文件验证</Text>
                </View>

                <View className="space-y-4">
                  <Label>最大文件大小 (MB)</Label>
                  <View className="flex-row items-center space-x-2">
                    <Slider
                      value={formState.maxFileSize / (1024 * 1024)} // Convert bytes to MB
                      onValueChange={handleMaxFileSizeChange}
                      minimumValue={1}
                      maximumValue={10000}
                      step={100}
                      minimumTrackTintColor="#3b82f6"
                      maximumTrackTintColor="#d1d5db"
                      className="flex-1"
                    />
                    <Badge variant="secondary">
                      {Math.round(formState.maxFileSize / (1024 * 1024))}MB
                    </Badge>
                  </View>
                </View>

                <View className="space-y-2 mt-4">
                  <Label>允许的文件类型</Label>
                  <Input
                    value={formState.allowedFileTypes.join(", ")}
                    onChangeText={handleAllowedFileTypesChange}
                    placeholder="例如: jpg, png, pdf"
                  />
                </View>

                <View className="flex-row justify-between items-center mt-4">
                  <Label>验证文件校验和</Label>
                  <Switch
                    checked={!!formState.checksumVerification}
                    onCheckedChange={(checked: boolean) =>
                      updateFormState("checksumVerification", checked)
                    }
                  />
                </View>
              </CardContent>
            </Card>
          </Animated.View>
        );
      
      case "advanced":
        return (
          <Animated.View 
            entering={FadeIn.duration(300)} 
            exiting={FadeOut.duration(200)}
            className="space-y-6"
          >
            <Card className="border-border">
              <CardContent className="p-4">
                <View className="flex-row items-center space-x-2 mb-4">
                  <Wifi size={20} className="text-primary" />
                  <Text className="text-lg font-medium">网络设置</Text>
                </View>

                <View className="space-y-4">
                  <Label>带宽限制 (KB/s，0 为不限制)</Label>
                  <View className="flex-row items-center space-x-2">
                    <Slider
                      value={formState.bandwidthLimit || 0}
                      onValueChange={handleBandwidthLimitChange}
                      minimumValue={0}
                      maximumValue={10000}
                      step={100}
                      minimumTrackTintColor="#3b82f6"
                      maximumTrackTintColor="#d1d5db"
                      className="flex-1"
                    />
                    <Badge variant="secondary">
                      {(formState.bandwidthLimit || 0) > 0 
                        ? `${formState.bandwidthLimit} KB/s` 
                        : "不限制"}
                    </Badge>
                  </View>
                </View>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="p-4">
                <View className="flex-row items-center space-x-2 mb-4">
                  <Clock size={20} className="text-primary" />
                  <Text className="text-lg font-medium">下载调度</Text>
                </View>

                <View className="flex-row justify-between items-center">
                  <Label>队列优先级排序</Label>
                  <Switch
                    checked={formState.notificationsEnabled}
                    onCheckedChange={(checked: boolean) =>
                      updateFormState("notificationsEnabled", checked)
                    }
                  />
                </View>

                <View className="flex-row justify-between items-center mt-4">
                  <Label>启用重试机制</Label>
                  <Switch
                    checked={formState.retryAttempts > 0}
                    onCheckedChange={(checked: boolean) =>
                      updateFormState("retryAttempts", checked ? 3 : 0)
                    }
                  />
                </View>

                {formState.retryAttempts > 0 && (
                  <View className="space-y-4 mt-4">
                    <Label>最大重试次数</Label>
                    <View className="flex-row items-center space-x-2">
                      <Slider
                        value={formState.retryAttempts}
                        onValueChange={(value) => updateFormState("retryAttempts", value)}
                        minimumValue={1}
                        maximumValue={10}
                        step={1}
                        minimumTrackTintColor="#3b82f6"
                        maximumTrackTintColor="#d1d5db"
                        className="flex-1"
                      />
                      <Badge variant="secondary">
                        {formState.retryAttempts}次
                      </Badge>
                    </View>
                  </View>
                )}
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="p-4">
                <View className="flex-row items-center space-x-2 mb-4">
                  <FolderTree size={20} className="text-primary" />
                  <Text className="text-lg font-medium">文件组织</Text>
                </View>

                <View className="space-y-2">
                  <Label>下载目录</Label>
                  <Input
                    value={formState.downloadLocation}
                    onChangeText={(value: string) =>
                      updateFormState("downloadLocation", value)
                    }
                    placeholder="Downloads"
                  />
                </View>

                <View className="flex-row justify-between items-center mt-4">
                  <Label>按文件类型组织</Label>
                  <Switch
                    checked={!!formState.organizeByType}
                    onCheckedChange={(checked: boolean) =>
                      updateFormState("organizeByType", checked)
                    }
                  />
                </View>

                <View className="flex-row justify-between items-center mt-4">
                  <Label>按日期组织</Label>
                  <Switch
                    checked={!!formState.organizeByDate}
                    onCheckedChange={(checked: boolean) =>
                      updateFormState("organizeByDate", checked)
                    }
                  />
                </View>
              </CardContent>
            </Card>
          </Animated.View>
        );
      
      default:
        return null;
    }
  }, [activeTab, formState, handleAllowedFileTypesChange, handleAutoResumeChange, handleBandwidthLimitChange, handleMaxDownloadsChange, handleMaxFileSizeChange, updateFormState]);

  return (
    <Dialog open={visible} onOpenChange={(isOpen: boolean) => !isOpen && onClose()}>
      <DialogContent className="w-[90%] max-w-md">
        <DialogHeader>
          <DialogTitle>下载设置</DialogTitle>
        </DialogHeader>

        {/* 选项卡导航 */}
        <View className="flex-row border-b border-border mb-4">
          <TouchableOpacity 
            onPress={() => setActiveTab("basic")}
            className={`flex-1 py-2 px-4 items-center ${activeTab === "basic" ? "border-b-2 border-primary" : ""}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === "basic" }}
          >
            <Text className={activeTab === "basic" ? "text-primary font-medium" : "text-muted-foreground"}>
              基本设置
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => setActiveTab("advanced")}
            className={`flex-1 py-2 px-4 items-center ${activeTab === "advanced" ? "border-b-2 border-primary" : ""}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === "advanced" }}
          >
            <Text className={activeTab === "advanced" ? "text-primary font-medium" : "text-muted-foreground"}>
              高级设置
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView className="max-h-[60vh]">
          <View className="space-y-4 p-2">
            {showSuccess && (
              <Animated.View entering={ZoomIn.duration(300)}>
                <Alert variant="default">
                  <View className="flex-row items-center">
                    <CheckCircle size={18} className="text-primary mr-2" />
                    <AlertTitle>已保存</AlertTitle>
                  </View>
                  <AlertDescription>设置已保存并生效</AlertDescription>
                </Alert>
              </Animated.View>
            )}
            
            {renderTab()}
          </View>
        </ScrollView>

        <DialogFooter>
          <View className="flex-row justify-end space-x-2 mt-4">
            <Button variant="outline" onPress={onClose}>
              <X size={18} className="mr-1" />
              取消
            </Button>
            <Button 
              onPress={handleSaveSettings} 
              disabled={!unsavedChanges}
              className={!unsavedChanges ? "opacity-50" : ""}
            >
              <Save size={18} className="mr-1" />
              保存设置
            </Button>
          </View>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// 使用React.memo优化渲染性能
export const DownloadSettings = React.memo(DownloadSettingsComponent);
