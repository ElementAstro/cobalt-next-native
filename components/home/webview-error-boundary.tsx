import React, { useEffect, useState } from "react";
import { View, ScrollView, TouchableOpacity, Platform, AccessibilityInfo } from "react-native";
import { ErrorBoundary } from "react-error-boundary";
import {
  AlertCircle,
  RefreshCw,
  XCircle,
  Bug,
  Cpu,
  FileBug,
  ArrowLeft,
  RotateCcw,
  XOctagon,
  Info,
  HelpCircle,
  Terminal,
} from "lucide-react-native";
import { Alert, AlertTitle, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import { Badge } from "~/components/ui/badge";
import { Card, CardHeader, CardContent, CardFooter } from "~/components/ui/card";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInUp,
  SlideOutDown,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  withRepeat,
  withDelay,
  Easing,
  interpolate,
  Extrapolate,
  cancelAnimation,
  ZoomIn,
  ZoomOut,
  LinearTransition,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { toast } from "sonner-native";

// 创建动画组件
const AnimatedCard = Animated.createAnimatedComponent(Card);
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

// 错误类型枚举
enum ErrorType {
  NETWORK = "network",
  RENDERING = "rendering",
  JAVASCRIPT = "javascript",
  UNKNOWN = "unknown",
}

// 错误处理工具函数
const categorizeError = (error: Error): ErrorType => {
  const message = error.message.toLowerCase();
  
  if (message.includes("network") || 
      message.includes("connection") ||
      message.includes("offline") ||
      message.includes("timeout") ||
      message.includes("failed to fetch")) {
    return ErrorType.NETWORK;
  }
  
  if (message.includes("render") ||
      message.includes("element") ||
      message.includes("component") ||
      message.includes("dom") ||
      message.includes("layout")) {
    return ErrorType.RENDERING;  
  }
  
  if (message.includes("script") ||
      message.includes("javascript") ||
      message.includes("undefined is not") ||
      message.includes("cannot read property") ||
      message.includes("null") ||
      message.includes("unexpected token")) {
    return ErrorType.JAVASCRIPT;
  }
  
  return ErrorType.UNKNOWN;
};

interface FallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

const ErrorFallback = ({ error, resetErrorBoundary }: FallbackProps) => {
  // 状态管理
  const [isCodeExpanded, setIsCodeExpanded] = useState(false);
  const [errorType, setErrorType] = useState<ErrorType>(ErrorType.UNKNOWN);
  const [retryAttempts, setRetryAttempts] = useState(0);
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState(false);
  const [isErrorCollapsed, setIsErrorCollapsed] = useState(true);
  
  // 动画值
  const cardScale = useSharedValue(1);
  const buttonScale = useSharedValue(1);
  const codeBlockHeight = useSharedValue(0);
  const pulseAnimation = useSharedValue(0);
  const iconRotation = useSharedValue(0);
  const errorDetailsOpacity = useSharedValue(0);
  const shimmerPosition = useSharedValue(-1);
  
  // 初始化错误类型
  useEffect(() => {
    setErrorType(categorizeError(error));
  }, [error]);
  
  // 检查屏幕阅读器状态
  useEffect(() => {
    let isMounted = true;
    
    const checkScreenReader = async () => {
      try {
        const isEnabled = await AccessibilityInfo.isScreenReaderEnabled();
        if (isMounted) {
          setIsScreenReaderEnabled(isEnabled);
        }
      } catch (error) {
        console.warn("Failed to check screen reader status:", error);
      }
    };
    
    checkScreenReader();
    
    const subscription = AccessibilityInfo.addEventListener(
      "screenReaderChanged",
      setIsScreenReaderEnabled
    );
    
    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);
  
  // 启动动画
  useEffect(() => {
    // 卡片入场动画
    cardScale.value = withSequence(
      withTiming(0.95, { duration: 100 }),
      withSpring(1, { 
        damping: 14,
        stiffness: 100,
        mass: 1
      })
    );
    
    // 脉冲动画
    pulseAnimation.value = withRepeat(
      withSequence(
        withTiming(1, { 
          duration: 2000, 
          easing: Easing.inOut(Easing.quad) 
        }),
        withTiming(0, { 
          duration: 2000, 
          easing: Easing.inOut(Easing.quad) 
        })
      ),
      -1,
      true
    );
    
    // 图标旋转动画
    iconRotation.value = withSequence(
      withDelay(
        500,
        withTiming(-15, { duration: 150, easing: Easing.inOut(Easing.quad) })
      ),
      withTiming(15, { duration: 300, easing: Easing.inOut(Easing.quad) }),
      withTiming(0, { duration: 150, easing: Easing.inOut(Easing.quad) })
    );
    
    // 闪烁动画
    shimmerPosition.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      -1,
      false
    );
    
    return () => {
      cancelAnimation(cardScale);
      cancelAnimation(buttonScale);
      cancelAnimation(pulseAnimation);
      cancelAnimation(iconRotation);
      cancelAnimation(shimmerPosition);
    };
  }, []);
  
  // 代码块展开/收起动画
  useEffect(() => {
    codeBlockHeight.value = withTiming(
      isCodeExpanded ? 150 : 0,
      { duration: 300, easing: Easing.inOut(Easing.quad) }
    );
  }, [isCodeExpanded]);
  
  // 错误详情展开/收起动画
  useEffect(() => {
    errorDetailsOpacity.value = withTiming(
      isErrorCollapsed ? 0 : 1,
      { duration: 300, easing: Easing.inOut(Easing.quad) }
    );
  }, [isErrorCollapsed]);

  // 动画样式
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
    shadowOpacity: interpolate(
      cardScale.value, 
      [0.95, 1], 
      [0.1, 0.25],
      Extrapolate.CLAMP
    ),
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));
  
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ rotateZ: `${iconRotation.value}deg` }],
  }));
  
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      pulseAnimation.value, 
      [0, 0.5, 1], 
      [0.7, 0.9, 0.7],
      Extrapolate.CLAMP
    ),
    transform: [{ 
      scale: interpolate(
        pulseAnimation.value, 
        [0, 0.5, 1], 
        [0.98, 1.02, 0.98],
        Extrapolate.CLAMP
      ) 
    }],
  }));
  
  const codeBlockStyle = useAnimatedStyle(() => ({
    height: codeBlockHeight.value,
    opacity: interpolate(
      codeBlockHeight.value,
      [0, 50],
      [0, 1],
      Extrapolate.CLAMP
    ),
  }));
  
  const errorDetailsStyle = useAnimatedStyle(() => ({
    opacity: errorDetailsOpacity.value,
    display: errorDetailsOpacity.value === 0 ? 'none' : 'flex',
  }));
  
  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ 
      translateX: interpolate(
        shimmerPosition.value, 
        [-1, 1], 
        [-100, 300],
        Extrapolate.CLAMP
      ) 
    }],
  }));

  // 错误图标和信息
  const getErrorInfo = () => {
    switch(errorType) {
      case ErrorType.NETWORK:
        return {
          icon: <XCircle size={28} className="text-amber-500" />,
          title: "网络错误",
          description: "连接服务器失败，请检查网络连接",
          suggestion: "请确保您的网络连接正常并重试",
          color: "bg-amber-500/10 text-amber-500"
        };
        
      case ErrorType.RENDERING:
        return {
          icon: <Bug size={28} className="text-purple-500" />,
          title: "渲染错误",
          description: "页面无法正确渲染",
          suggestion: "可能是内容格式不兼容或资源加载失败",
          color: "bg-purple-500/10 text-purple-500"
        };
        
      case ErrorType.JAVASCRIPT:
        return {
          icon: <FileBug size={28} className="text-blue-500" />,
          title: "脚本错误",
          description: "JavaScript执行出错",
          suggestion: "页面脚本执行过程中遇到了问题",
          color: "bg-blue-500/10 text-blue-500"
        };
        
      default:
        return {
          icon: <AlertCircle size={28} className="text-destructive" />,
          title: "未知错误",
          description: "发生了未知错误",
          suggestion: "请重试或联系开发者获取帮助",
          color: "bg-destructive/10 text-destructive"
        };
    }
  };
  
  const errorInfo = getErrorInfo();

  // 处理重试
  const handleRetry = () => {
    buttonScale.value = withSequence(
      withSpring(0.95, { damping: 10, stiffness: 300 }),
      withSpring(1, { damping: 15, stiffness: 200 })
    );
    
    cardScale.value = withSequence(
      withSpring(0.98, { damping: 10, stiffness: 300 }),
      withSpring(1, { damping: 15, stiffness: 200 })
    );

    // 触觉反馈
    if (Platform.OS !== "web" && !isScreenReaderEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    // 增加重试次数
    setRetryAttempts(retryAttempts + 1);
    
    // 显示吐司提示
    toast.success("正在重试", {
      description: `重试次数: ${retryAttempts + 1}`,
    });
    
    // 重置错误边界
    resetErrorBoundary();
  };
  
  // 复制错误信息
  const handleCopyError = () => {
    // 这里会有实际复制到剪贴板的代码
    // 示例: Clipboard.setString(error.message);
    
    buttonScale.value = withSequence(
      withSpring(0.95),
      withSpring(1)
    );
    
    // 触觉反馈
    if (Platform.OS !== "web" && !isScreenReaderEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    
    // 显示吐司提示
    toast.success("已复制错误信息");
  };
  
  // 切换代码展开状态
  const toggleCodeExpand = () => {
    // 触觉反馈
    if (Platform.OS !== "web" && !isScreenReaderEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    setIsCodeExpanded(!isCodeExpanded);
  };
  
  // 切换错误详情展示状态
  const toggleErrorDetails = () => {
    // 触觉反馈
    if (Platform.OS !== "web" && !isScreenReaderEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    setIsErrorCollapsed(!isErrorCollapsed);
  };

  return (
    <Animated.View
      entering={FadeIn.springify()}
      exiting={FadeOut.duration(200)}
      style={cardStyle}
      className="flex-1 bg-background/90 backdrop-blur-sm"
    >
      <ScrollView
        className="flex-1 p-6"
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 8 }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          entering={SlideInUp.springify().delay(150)}
          exiting={SlideOutDown}
          layout={LinearTransition.springify()}
          className="space-y-6"
        >
          {/* 错误卡片 */}
          <AnimatedCard
            style={pulseStyle}
            className="overflow-hidden border-2 rounded-3xl shadow-lg backdrop-blur-xl"
          >
            {/* 顶部图标和标题 */}
            <CardHeader className={`${errorInfo.color} pb-2`}>
              <View className="flex-row items-center space-x-4">
                <Animated.View style={iconStyle}>
                  {errorInfo.icon}
                </Animated.View>
                <View className="space-y-1 flex-1">
                  <AlertTitle className="text-lg font-semibold">
                    {errorInfo.title}
                  </AlertTitle>
                  <AlertDescription className="text-sm opacity-90">
                    {errorInfo.description}
                  </AlertDescription>
                </View>
              </View>
            </CardHeader>

            <CardContent className="space-y-4 pt-4">
              <Text className="text-base text-foreground">
                {errorInfo.suggestion}
              </Text>
              
              <View className="flex-row space-x-2 flex-wrap">
                <Badge variant="secondary" className="rounded-full mb-2">
                  <RefreshCw size={12} className="mr-1" />
                  <Text className="text-xs">重试次数: {retryAttempts}</Text>
                </Badge>
                
                <Badge variant="outline" className="rounded-full mb-2">
                  <Terminal size={12} className="mr-1 text-muted-foreground" />
                  <Text className="text-xs text-muted-foreground">错误类型: {errorType}</Text>
                </Badge>
              </View>
              
              {/* 错误详情展开/折叠按钮 */}
              <TouchableOpacity
                onPress={toggleErrorDetails}
                className="flex-row items-center space-x-2 py-2"
                accessibilityRole="button"
                accessibilityLabel="查看错误详情"
                accessibilityHint={isErrorCollapsed ? "展开错误详情" : "折叠错误详情"}
              >
                <Info size={16} className="text-primary" />
                <Text className="text-sm font-medium text-primary">
                  {isErrorCollapsed ? "查看错误详情" : "隐藏错误详情"}
                </Text>
              </TouchableOpacity>
              
              {/* 错误详情展开区域 */}
              <Animated.View
                style={errorDetailsStyle}
                className="space-y-2"
              >
                <View className="bg-muted/50 dark:bg-muted/20 p-3 rounded-xl">
                  <Text className="text-sm text-destructive/90 font-medium">
                    {error.message || "发生了未知错误"}
                  </Text>
                </View>
                
                {/* 错误堆栈展开/折叠按钮 */}
                {error.stack && (
                  <>
                    <TouchableOpacity
                      onPress={toggleCodeExpand}
                      className="flex-row items-center space-x-2 py-2"
                      accessibilityRole="button"
                      accessibilityLabel="查看错误堆栈"
                      accessibilityHint={isCodeExpanded ? "折叠错误堆栈" : "展开错误堆栈"}
                    >
                      <Cpu size={14} className="text-muted-foreground" />
                      <Text className="text-xs font-medium text-muted-foreground">
                        {isCodeExpanded ? "隐藏错误堆栈" : "查看错误堆栈"}
                      </Text>
                    </TouchableOpacity>
                    
                    {/* 错误堆栈展开区域 */}
                    <Animated.View 
                      style={codeBlockStyle}
                      className="relative overflow-hidden"
                    >
                      <View className="bg-muted/10 dark:bg-muted/20 p-3 rounded-lg">
                        <ScrollView
                          className="h-full"
                          nestedScrollEnabled={true}
                        >
                          <Text className="text-xs font-mono text-muted-foreground">
                            {error.stack}
                          </Text>
                        </ScrollView>
                        
                        {/* 闪光效果 */}
                        <Animated.View
                          style={shimmerStyle}
                          className="absolute top-0 left-0 right-0 bottom-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                        />
                      </View>
                    </Animated.View>
                  </>
                )}
                
                {/* 复制错误按钮 */}
                <Button
                  variant="outline"
                  size="sm"
                  onPress={handleCopyError}
                  className="mt-2"
                >
                  <Copy size={14} className="mr-2" />
                  <Text className="text-xs">复制错误信息</Text>
                </Button>
              </Animated.View>
            </CardContent>
            
            <CardFooter className="pt-2 pb-4">
              <View className="flex-row space-x-3 w-full">
                <AnimatedTouchable 
                  style={buttonStyle}
                  className="flex-1"
                  activeOpacity={0.7}
                  onPress={() => {
                    if (Platform.OS !== "web" && !isScreenReaderEnabled) {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="返回"
                >
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full rounded-xl"
                  >
                    <ArrowLeft className="mr-2 h-5 w-5" />
                    <Text>返回</Text>
                  </Button>
                </AnimatedTouchable>
                
                <AnimatedTouchable
                  style={buttonStyle}
                  className="flex-1"
                  activeOpacity={0.7}
                  onPress={handleRetry}
                  accessibilityRole="button"
                  accessibilityLabel="重试"
                  accessibilityHint="重新加载WebView"
                >
                  <Button
                    variant="default"
                    size="lg"
                    className="w-full rounded-xl"
                  >
                    <RotateCcw className="mr-2 h-5 w-5" />
                    <Text>重试</Text>
                  </Button>
                </AnimatedTouchable>
              </View>
            </CardFooter>
          </AnimatedCard>
          
          {/* 帮助卡片 */}
          <Animated.View
            entering={SlideInUp.delay(300).springify()}
          >
            <TouchableOpacity
              className="flex-row items-center space-x-3 bg-primary/10 p-4 rounded-2xl"
              onPress={() => {
                if (Platform.OS !== "web" && !isScreenReaderEnabled) {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
              }}
              accessibilityRole="button"
              accessibilityLabel="获取帮助"
            >
              <HelpCircle size={20} className="text-primary" />
              <View className="flex-1">
                <Text className="text-sm font-medium text-primary mb-1">
                  需要帮助？
                </Text>
                <Text className="text-xs text-primary/80">
                  点击此处查看常见问题解答或联系支持
                </Text>
              </View>
              <ArrowRight size={16} className="text-primary/80" />
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </ScrollView>
    </Animated.View>
  );
};

export const WebViewErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => {
        // 重置任何状态
      }}
      onError={(error) => {
        // 错误日志记录
        console.error("WebView Error:", error);
        
        // 如果需要，这里可以添加额外的错误报告逻辑
        // 比如发送到错误追踪系统
      }}
    >
      {children}
    </ErrorBoundary>
  );
};