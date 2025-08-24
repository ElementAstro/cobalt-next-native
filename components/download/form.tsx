import React, { useState, useCallback, useMemo, useRef } from "react";
import { View, ActivityIndicator, TextInput, Keyboard, TouchableWithoutFeedback } from "react-native";
import useDownloadStore from "../../stores/useDownloadStore";
import { z } from "zod";
import { toast } from "sonner-native";
import { Link, FileDown, AlertCircle, Check, ClipboardPaste } from "lucide-react-native";
import { useDebouncedCallback } from "use-debounce";
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSequence, 
  withTiming,
  Easing,
  FadeIn,
  SlideInUp
} from "react-native-reanimated";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Text } from "~/components/ui/text";
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';

const urlSchema = z.string().url("请输入有效的下载链接");
const filenameSchema = z
  .string()
  .min(1)
  .max(255)
  .regex(/^[^<>:"/\\|?*]+$/, "文件名包含无效字符");

export const DownloadForm: React.FC = React.memo(() => {
  const [url, setUrl] = useState("");
  const [filename, setFilename] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [urlError, setUrlError] = useState("");
  const [filenameError, setFilenameError] = useState("");
  const [isFocused, setIsFocused] = useState<'url' | 'filename' | null>(null);
  const urlInputRef = useRef<TextInput | null>(null);
  const filenameInputRef = useRef<TextInput | null>(null);
  
  // 动画值
  const shakeAnimation = useSharedValue(0);
  const successAnimation = useSharedValue(0);
  
  // 表单高度动画
  const formScale = useSharedValue(0.98);
  const formOpacity = useSharedValue(0);
  
  React.useEffect(() => {
    formScale.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.back()) });
    formOpacity.value = withTiming(1, { duration: 300 });
  }, []);
  
  const formAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: formScale.value }],
      opacity: formOpacity.value,
    };
  });

  // 验证动画样式
  const shakeAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: shakeAnimation.value }],
    };
  });
  
  const successAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: successAnimation.value,
    };
  });

  // 触发抖动动画
  const triggerShakeAnimation = () => {
    shakeAnimation.value = withSequence(
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(0, { duration: 50 })
    );
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  };
  
  // 触发成功动画
  const triggerSuccessAnimation = () => {
    successAnimation.value = withSequence(
      withTiming(1, { duration: 300 }),
      withTiming(0, { duration: 300, easing: Easing.in(Easing.ease) })
    );
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // URL验证
  const validateUrl = useDebouncedCallback((value: string) => {
    try {
      urlSchema.parse(value);
      setUrlError("");
    } catch (error) {
      if (error instanceof z.ZodError) {
        const zodError = error.errors[0]?.message || "Invalid URL";
        setUrlError(zodError);
        if (value) triggerShakeAnimation();
      } else {
        setUrlError("Invalid URL");
      }
    }
  }, 500);

  // 文件名验证
  const validateFilename = useCallback((value: string) => {
    if (!value) {
      setFilenameError("");
      return;
    }
    try {
      filenameSchema.parse(value);
      setFilenameError("");
    } catch (error) {
      if (error instanceof z.ZodError) {
        const zodError = error.errors[0]?.message || "Invalid filename";
        setFilenameError(zodError);
        triggerShakeAnimation();
      } else {
        setFilenameError("Invalid filename");
      }
    }
  }, []);

  const addDownload = useDownloadStore((state) => state.addDownload);
  const cancelDownload = useDownloadStore((state) => state.cancelDownload);

  // 粘贴URL
  const handlePasteUrl = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (text) {
        setUrl(text);
        validateUrl(text);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.error('Failed to paste from clipboard', error);
    }
  };

  // 提交表单
  const handleSubmit = async () => {
    if (!url || urlError || filenameError) {
      triggerShakeAnimation();
      return;
    }

    try {
      setIsLoading(true);
      const finalFilename = filename || url.split("/").pop() || "unknown";

      const downloadId = await addDownload(url, finalFilename);
      
      triggerSuccessAnimation();

      toast.success("下载任务已添加", {
        description: `将下载: ${finalFilename}`,
        icon: <Check size={20} />,
        action: {
          label: "撤销",
          onClick: () => cancelDownload(downloadId),
        },
      });

      setUrl("");
      setFilename("");
      Keyboard.dismiss();
    } catch (error) {
      toast.error("添加下载失败", {
        description: error instanceof Error ? error.message : "未知错误",
        icon: <AlertCircle size={20} />,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 表单验证状态
  const isValid = useMemo(
    () => url && !urlError && !filenameError,
    [url, urlError, filenameError]
  );

  // 组件加载时聚焦URL输入框
  useFocusEffect(
    React.useCallback(() => {
      setTimeout(() => {
        urlInputRef.current?.focus();
      }, 500);
      
      return () => {};
    }, [])
  );

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <Animated.View 
        className="p-4 bg-card shadow-sm rounded-lg mb-4 space-y-6"
        style={formAnimatedStyle}
      >
        <Animated.View 
          className="absolute top-1 right-1 p-1 rounded-full bg-green-500"
          style={successAnimatedStyle}
        >
          <Check size={16} color="#fff" />
        </Animated.View>
        
        <Animated.View entering={FadeIn.delay(100)}>
          <Label 
            className="mb-2"
            accessibilityRole="text"
            accessibilityHint="输入要下载的URL"
          >
            下载链接
          </Label>
          <View className="relative">
            <View className="absolute left-3 top-3 z-10">
              <Link 
                size={20} 
                className={isFocused === 'url' ? "text-primary" : "text-muted-foreground"} 
              />
            </View>
            
            <Animated.View style={shakeAnimatedStyle} className="flex-1">
              <Input
                ref={urlInputRef}
                placeholder="输入下载链接"
                value={url}
                onChangeText={(text) => {
                  setUrl(text);
                  validateUrl(text);
                }}
                onFocus={() => setIsFocused('url')} 
                onBlur={() => setIsFocused(null)}
                className={`pl-10 ${isFocused === 'url' ? 'border-primary' : ''}`}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
                keyboardType="url"
                returnKeyType="next"
                onSubmitEditing={() => filenameInputRef.current?.focus()}
                accessibilityRole="text"
                accessibilityLabel="下载链接输入框"
                accessibilityHint="输入要下载的URL链接"
              />
            </Animated.View>
            
            <TouchableWithoutFeedback onPress={handlePasteUrl}>
              <View className="absolute right-3 top-3 z-10">
                <ClipboardPaste 
                  size={18} 
                  className="text-muted-foreground" 
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
          
          {urlError && (
            <Animated.View entering={SlideInUp.duration(200)}>
              <Text className="text-destructive text-sm mt-1 flex-row items-center">
                <AlertCircle size={14} className="mr-1" />
                {urlError}
              </Text>
            </Animated.View>
          )}
        </Animated.View>

        <Animated.View entering={FadeIn.delay(200)}>
          <Label 
            className="mb-2"
            accessibilityRole="text"
            accessibilityHint="输入文件名"
          >
            文件名 (可选)
          </Label>
          <View className="relative">
            <View className="absolute left-3 top-3 z-10">
              <FileDown 
                size={20} 
                className={isFocused === 'filename' ? "text-primary" : "text-muted-foreground"}
              />
            </View>
            
            <Animated.View style={shakeAnimatedStyle} className="flex-1">
              <Input
                ref={filenameInputRef}
                placeholder="留空将使用默认文件名"
                value={filename}
                onChangeText={(text) => {
                  setFilename(text);
                  validateFilename(text);
                }}
                onFocus={() => setIsFocused('filename')}
                onBlur={() => setIsFocused(null)}
                className={`pl-10 ${isFocused === 'filename' ? 'border-primary' : ''}`}
                returnKeyType="done"
                accessibilityRole="text"
                accessibilityLabel="文件名输入框"
                accessibilityHint="输入文件保存的名称，可选"
              />
            </Animated.View>
          </View>
          
          {filenameError && (
            <Animated.View entering={SlideInUp.duration(200)}>
              <Text className="text-destructive text-sm mt-1 flex-row items-center">
                <AlertCircle size={14} className="mr-1" />
                {filenameError}
              </Text>
            </Animated.View>
          )}
        </Animated.View>

        <Animated.View entering={FadeIn.delay(300)}>
          <Button
            variant={isValid ? "default" : "secondary"}
            disabled={!isValid || isLoading}
            onPress={handleSubmit}
            className={`w-full ${isValid ? "bg-primary hover:bg-primary/90" : ""}`}
            accessibilityRole="button"
            accessibilityLabel="添加下载任务"
            accessibilityHint={isValid ? "点击添加下载任务" : "请先输入有效的下载链接"}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" className="mr-2" />
            ) : (
              <FileDown size={20} className="mr-2" />
            )}
            添加下载任务
          </Button>
        </Animated.View>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
});

DownloadForm.displayName = "DownloadForm";
