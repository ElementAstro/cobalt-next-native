import React, { useState, useEffect } from "react";
import { View, ScrollView, Platform, Linking } from "react-native";
import {
  AlertTriangle,
  RefreshCw,
  ShieldAlert,
  Info,
  ArrowLeft,
  ExternalLink,
  Bug,
  Wifi,
  Lock,
  FileWarning,
  History,
  HelpCircle,
  Home,
  Share2,
  Copy,
  RotateCw,
} from "lucide-react-native";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import { Card } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { Badge } from "~/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInUp,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withSpring,
  withRepeat,
  ZoomIn,
  BounceIn,
  Layout,
  Easing,
} from "react-native-reanimated";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onReset?: () => void;
  onGoBack?: () => void;
  onGoHome?: () => void;
  helpURL?: string;
  logError?: (error: Error, info: React.ErrorInfo) => void;
  resetOnPropsChange?: boolean;
  retryDelay?: number;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
  errorType?:
    | "critical"
    | "recoverable"
    | "network"
    | "permission"
    | "validation"
    | "data"
    | "storage"
    | "timeout"
    | "unsupported";
  retryCount: number;
  autoRetrying: boolean;
  lastUpdated: number;
}

const AnimatedCard = Animated.createAnimatedComponent(Card);

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    retryCount: 0,
    autoRetrying: false,
    lastUpdated: Date.now(),
  };
  
  private autoRetryTimeout: NodeJS.Timeout | null = null;

  static getDerivedStateFromError(error: Error): Partial<State> {
    // 根据错误类型设置不同的 errorType
    let errorType: State["errorType"] = "critical";
    const errorMessage = error.message.toLowerCase();

    if (
      errorMessage.includes("network") ||
      errorMessage.includes("connection") ||
      errorMessage.includes("offline") ||
      errorMessage.includes("internet") ||
      errorMessage.includes("fetch") ||
      errorMessage.includes("api") ||
      errorMessage.includes("server")
    ) {
      errorType = "network";
    } else if (
      errorMessage.includes("permission") ||
      errorMessage.includes("access") ||
      errorMessage.includes("denied") ||
      errorMessage.includes("forbidden") ||
      errorMessage.includes("401") ||
      errorMessage.includes("403")
    ) {
      errorType = "permission";
    } else if (
      errorMessage.includes("validation") ||
      errorMessage.includes("invalid") ||
      errorMessage.includes("format") ||
      errorMessage.includes("schema")
    ) {
      errorType = "validation";
    } else if (
      errorMessage.includes("timeout") ||
      errorMessage.includes("timed out") ||
      errorMessage.includes("too long")
    ) {
      errorType = "timeout";
    } else if (
      errorMessage.includes("storage") ||
      errorMessage.includes("disk") ||
      errorMessage.includes("space") ||
      errorMessage.includes("quota")
    ) {
      errorType = "storage";
    } else if (
      errorMessage.includes("data") ||
      errorMessage.includes("parse") ||
      errorMessage.includes("json") ||
      errorMessage.includes("corrupt")
    ) {
      errorType = "data";
    } else if (
      errorMessage.includes("unsupported") ||
      errorMessage.includes("browser") ||
      errorMessage.includes("version")
    ) {
      errorType = "unsupported";
    } else if (
      errorMessage.includes("recoverable") ||
      errorMessage.includes("retry") ||
      errorMessage.includes("temporary")
    ) {
      errorType = "recoverable";
    }

    return {
      hasError: true,
      error,
      errorType,
    };
  }
  
  // 在 props 更改时，如果配置了 resetOnPropsChange，则重置错误状态
  static getDerivedStateFromProps(props: Props, state: State) {
    if (props.resetOnPropsChange && state.hasError && Date.now() - state.lastUpdated > 1000) {
      return {
        hasError: false,
        lastUpdated: Date.now()
      };
    }
    return null;
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ 
      errorInfo,
      retryCount: 0,
      autoRetrying: false
    });
    
    // 记录错误
    console.error("Image Component Error:", error, errorInfo);
    
    // 调用自定义错误日志记录函数
    this.props.logError?.(error, errorInfo);

    // 触发震动反馈
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    
    // 根据错误类型决定是否自动重试
    const shouldAutoRetry = 
      this.state.errorType === "network" || 
      this.state.errorType === "timeout" || 
      this.state.errorType === "recoverable";
      
    if (shouldAutoRetry && this.props.retryDelay) {
      this.triggerAutoRetry();
    }
  }
  
  componentWillUnmount() {
    this.clearAutoRetryTimeout();
  }
  
  clearAutoRetryTimeout() {
    if (this.autoRetryTimeout) {
      clearTimeout(this.autoRetryTimeout);
      this.autoRetryTimeout = null;
    }
  }
  
  triggerAutoRetry = () => {
    const { retryDelay = 3000 } = this.props;
    
    this.clearAutoRetryTimeout();
    this.setState({ autoRetrying: true });
    
    this.autoRetryTimeout = setTimeout(() => {
      this.handleRetry();
      this.setState(prevState => ({ 
        retryCount: prevState.retryCount + 1,
        autoRetrying: false 
      }));
    }, retryDelay);
  };

  handleRetry = () => {
    this.setState({ 
      hasError: false,
      lastUpdated: Date.now()
    });
    
    this.props.onReset?.();

    // 触发震动反馈
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  handleGoBack = () => {
    // 执行返回操作
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    this.props.onGoBack?.();
  };
  
  handleGoHome = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    this.props.onGoHome?.();
  };
  
  handleOpenHelp = async () => {
    const { helpURL } = this.props;
    if (helpURL && await Linking.canOpenURL(helpURL)) {
      await Linking.openURL(helpURL);
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorDisplay
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          errorType={this.state.errorType}
          onRetry={this.handleRetry}
          onGoBack={this.handleGoBack}
          onGoHome={this.handleGoHome}
          onOpenHelp={this.props.helpURL ? this.handleOpenHelp : undefined}
          retryCount={this.state.retryCount}
          autoRetrying={this.state.autoRetrying}
          retryDelay={this.props.retryDelay}
        />
      );
    }

    return this.props.children;
  }
}

interface ErrorDisplayProps {
  error?: Error;
  errorInfo?: React.ErrorInfo;
  errorType?: State["errorType"];
  onRetry: () => void;
  onGoBack: () => void;
  onGoHome?: () => void;
  onOpenHelp?: () => void;
  retryCount: number;
  autoRetrying: boolean;
  retryDelay?: number;
}

// 错误显示组件，用于渲染不同类型的错误和相应的操作
const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  errorInfo,
  errorType = "critical",
  onRetry,
  onGoBack,
  onGoHome,
  onOpenHelp,
  retryCount,
  autoRetrying,
  retryDelay,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  
  // 动画值
  const scale = useSharedValue(0.95);
  const rotation = useSharedValue(0);
  const autoRetryProgress = useSharedValue(0);
  const pulseValue = useSharedValue(1);
  const shake = useSharedValue(0);

  useEffect(() => {
    // 入场动画
    scale.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.back(1.5)) });
    
    // 轻微旋转以增加视觉吸引力
    rotation.value = withSequence(
      withTiming(2, { duration: 300 }),
      withTiming(-1, { duration: 200 }),
      withTiming(0, { duration: 200 })
    );
    
    // 创建脉冲动画效果
    pulseValue.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true
    );
    
    // 振动效果
    shake.value = withSequence(
      withTiming(6, { duration: 80 }),
      withTiming(-6, { duration: 80 }),
      withTiming(4, { duration: 80 }),
      withTiming(-4, { duration: 80 }),
      withTiming(0, { duration: 80 })
    );
    
    return () => {
      // 清理动画
      cancelAnimation(pulseValue);
    };
  }, []);
  
  // 处理自动重试的进度条动画
  useEffect(() => {
    if (autoRetrying && retryDelay) {
      autoRetryProgress.value = 0;
      autoRetryProgress.value = withTiming(100, { duration: retryDelay });
    } else {
      autoRetryProgress.value = 0;
    }
  }, [autoRetrying, retryDelay]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotateZ: `${rotation.value}deg` }
    ],
  }));
  
  const iconStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: pulseValue.value }
      ]
    }
  });
  
  const shakeStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: shake.value }
      ]
    };
  });
  
  const autoRetryProgressStyle = useAnimatedStyle(() => {
    return {
      width: `${autoRetryProgress.value}%`
    };
  });

  const getErrorTitle = () => {
    switch (errorType) {
      case "network":
        return "网络连接错误";
      case "permission":
        return "权限受限";
      case "validation":
        return "数据验证失败";
      case "timeout":
        return "请求超时";
      case "storage":
        return "存储空间不足";
      case "data":
        return "数据格式错误";
      case "unsupported":
        return "不支持的操作";
      case "recoverable":
        return "操作暂时失败";
      default:
        return "处理图像时出错";
    }
  };

  const getErrorMessage = () => {
    if (error?.message) return error.message;

    switch (errorType) {
      case "network":
        return "无法连接到网络，请检查您的网络连接后重试";
      case "permission":
        return "应用没有足够的权限执行此操作，请检查权限设置";
      case "validation":
        return "提供的图像数据无效或格式不正确";
      case "timeout":
        return "处理图像请求超时，可能是由于网络连接缓慢或服务器响应时间过长";
      case "storage":
        return "设备存储空间不足，无法完成处理图像操作";
      case "data":
        return "图像数据已损坏或格式不受支持";
      case "unsupported":
        return "当前环境不支持此操作，请尝试在其他设备上运行";
      case "recoverable":
        return "发生了一个暂时性错误，可能很快就会自动恢复";
      default:
        return "图像处理过程中发生了未知错误，请尝试重新加载或联系支持团队";
    }
  };
  
  const getErrorTips = () => {
    switch (errorType) {
      case "network":
        return [
          "检查您的网络连接是否正常",
          "确认您连接的是稳定的WiFi或移动数据",
          "可能是服务器暂时不可用，稍后再试"
        ];
      case "permission":
        return [
          "在设备设置中检查应用权限",
          "确保已授予图像访问权限",
          "重启应用后再次尝试"
        ];
      case "validation":
      case "data":
        return [
          "尝试使用不同格式的图像",
          "确保图像未损坏且格式受支持",
          "图像可能过大，尝试降低分辨率"
        ];
      case "storage":
        return [
          "清理设备存储空间",
          "删除不需要的图像和文件",
          "检查应用缓存并清理"
        ];
      default:
        return [
          "重新加载页面或重启应用",
          "尝试使用不同的图像文件",
          "如果问题持续存在，请联系支持团队"
        ];
    }
  };

  const getErrorIcon = () => {
    switch (errorType) {
      case "network":
        return <Wifi className="h-16 w-16 text-amber-500" />;
      case "permission":
        return <Lock className="h-16 w-16 text-amber-500" />;
      case "validation":
      case "data":
        return <FileWarning className="h-16 w-16 text-amber-500" />;
      case "timeout":
        return <History className="h-16 w-16 text-amber-500" />;
      case "storage":
        return <Database className="h-16 w-16 text-amber-500" />;
      case "unsupported":
        return <FileWarning className="h-16 w-16 text-amber-500" />;
      case "recoverable":
        return <RefreshCw className="h-16 w-16 text-blue-500" />;
      default:
        return <Bug className="h-16 w-16 text-destructive" />;
    }
  };

  const handleCopyError = async () => {
    if (!error) return;
    
    try {
      const errorDetails = `
Error: ${error.message}
Type: ${errorType}
Stack: ${error.stack}
Time: ${new Date().toISOString()}
Platform: ${Platform.OS} ${Platform.Version}
Retry Count: ${retryCount}
`;
      
      await Clipboard.setStringAsync(errorDetails);
      setCopiedToClipboard(true);
      setShowSuccessMessage(true);
      
      // 触觉反馈
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      // 3秒后隐藏成功消息
      setTimeout(() => {
        setShowSuccessMessage(false);
      }, 3000);
    } catch (e) {
      console.error('Failed to copy error details to clipboard:', e);
    }
  };

  return (
    <View className="flex-1 items-center justify-center p-4 bg-gradient-to-b from-background to-background/95">
      <AnimatedCard 
        style={[containerStyle]}
        entering={FadeIn.duration(300)}
        className="w-full max-w-sm p-6 bg-background/90 backdrop-blur-sm border-border/50"
      >
        <Animated.View
          entering={ZoomIn.duration(400).delay(100)}
          style={iconStyle}
          className="items-center"
        >
          {getErrorIcon()}
        </Animated.View>

        <View className="items-center my-4">
          <Animated.Text
            entering={SlideInUp.duration(400).delay(200)}
            className="text-xl font-bold mb-2 text-center"
          >
            {getErrorTitle()}
          </Animated.Text>

          <Animated.Text
            entering={SlideInUp.duration(400).delay(300)}
            className="text-muted-foreground text-center mb-3"
          >
            {getErrorMessage()}
          </Animated.Text>
          
          <Animated.View entering={FadeIn.delay(400)} className="w-full">
            <Badge 
              variant={errorType === "critical" ? "destructive" : "outline"} 
              className="mb-2 self-center"
            >
              {errorType === "critical" ? "严重错误" : "可恢复"}
              {retryCount > 0 && ` · 已重试 ${retryCount} 次`}
            </Badge>
          </Animated.View>
          
          {/* 错误提示列表 */}
          <Animated.View 
            entering={FadeIn.delay(500)}
            className="w-full mt-2 bg-muted/30 p-3 rounded-md"
          >
            <Text className="text-sm font-medium mb-1">可能的解决方法：</Text>
            {getErrorTips().map((tip, index) => (
              <View key={index} className="flex-row items-center mt-1">
                <View className="h-1.5 w-1.5 rounded-full bg-primary mr-2" />
                <Text className="text-xs text-muted-foreground flex-1">{tip}</Text>
              </View>
            ))}
          </Animated.View>
        </View>

        {expanded && (
          <Animated.View
            entering={FadeIn.duration(300)}
            exiting={FadeOut.duration(200)}
            layout={Layout.springify()}
            className="bg-muted p-3 rounded-md mb-4"
          >
            <ScrollView style={{ maxHeight: 120 }}>
              <Text className="text-xs font-mono text-muted-foreground">
                {error?.stack || "没有可用的错误堆栈"}
              </Text>
            </ScrollView>
            
            <View className="flex-row justify-between mt-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8"
                onPress={handleCopyError}
              >
                <Copy className="h-3 w-3 mr-1" />
                <Text className="text-xs">复制错误信息</Text>
              </Button>
              
              {onOpenHelp && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8"
                  onPress={onOpenHelp}
                >
                  <HelpCircle className="h-3 w-3 mr-1" />
                  <Text className="text-xs">帮助中心</Text>
                </Button>
              )}
            </View>
            
            {showSuccessMessage && (
              <Animated.View
                entering={BounceIn.duration(300)}
                exiting={FadeOut.duration(300)}
              >
                <Alert variant="success" className="mt-2">
                  <AlertTitle>已复制到剪贴板</AlertTitle>
                </Alert>
              </Animated.View>
            )}
          </Animated.View>
        )}

        <Animated.View
          entering={SlideInUp.duration(400).delay(400)}
          style={shakeStyle}
          className="w-full space-y-3"
        >
          {/* 自动重试进度条 */}
          {autoRetrying && retryDelay && (
            <View className="mb-2 space-y-1">
              <View className="h-1 bg-muted rounded-full overflow-hidden">
                <Animated.View 
                  className="h-full bg-primary rounded-full" 
                  style={autoRetryProgressStyle}
                />
              </View>
              <View className="flex-row items-center justify-between">
                <Text className="text-xs text-muted-foreground">正在自动重试...</Text>
                <RotateCw className="h-3 w-3 text-muted-foreground animate-spin" />
              </View>
            </View>
          )}
        
          {/* 主要操作按钮 */}
          <Button
            onPress={onRetry}
            className="w-full h-12"
            variant={errorType === "critical" ? "outline" : "default"}
            disabled={autoRetrying}
          >
            <RefreshCw className="h-5 w-5 mr-2" />
            <Text>{autoRetrying ? "正在重试..." : "重试"}</Text>
          </Button>

          {/* 显示返回按钮 */}
          <Button
            onPress={onGoBack}
            className="w-full h-12"
            variant={errorType === "critical" ? "default" : "outline"}
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            <Text>返回</Text>
          </Button>
          
          {/* 回到主页 */}
          {onGoHome && (
            <Button
              onPress={onGoHome}
              className="w-full h-12"
              variant="ghost"
            >
              <Home className="h-5 w-5 mr-2" />
              <Text>回到主页</Text>
            </Button>
          )}

          {/* 显示详情按钮 */}
          <Button
            variant="ghost"
            onPress={() => setExpanded(!expanded)}
            className="mt-2"
          >
            <Text className="text-sm text-muted-foreground">
              {expanded ? "隐藏详情" : "显示详情"}
            </Text>
          </Button>
        </Animated.View>
      </AnimatedCard>
    </View>
  );
};

// 通用的 Database 图标组件
const Database = ({ className = "" }) => (
  <Animated.View className={className} entering={ZoomIn}>
    <Svg 
      width="100%" 
      height="100%" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth={2} 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </Svg>
  </Animated.View>
);

// 取消动画的辅助函数
const cancelAnimation = (value: Animated.SharedValue<any>) => {
  'worklet';
  value.value = withTiming(value.value);
};

// 从 react-native-svg 导入 SVG 组件
import Svg from 'react-native-svg';
