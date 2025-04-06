import React, { useState, useEffect } from "react";
import { View, ScrollView, Platform } from "react-native";
import {
  AlertTriangle,
  RefreshCw,
  ShieldAlert,
  Info,
  ArrowLeft,
} from "lucide-react-native";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import { Card } from "~/components/ui/card";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInUp,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withSpring,
  ZoomIn,
} from "react-native-reanimated";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onReset?: () => void;
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
    | "validation";
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  static getDerivedStateFromError(error: Error): State {
    // 根据错误类型设置不同的 errorType
    let errorType: State["errorType"] = "critical";

    if (
      error.message.includes("network") ||
      error.message.includes("connection") ||
      error.message.includes("timeout") ||
      error.message.toLowerCase().includes("offline")
    ) {
      errorType = "network";
    } else if (
      error.message.includes("permission") ||
      error.message.includes("access") ||
      error.message.includes("denied")
    ) {
      errorType = "permission";
    } else if (
      error.message.includes("validation") ||
      error.message.includes("invalid") ||
      error.message.includes("format")
    ) {
      errorType = "validation";
    } else if (
      error.message.includes("recoverable") ||
      error.message.includes("retry")
    ) {
      errorType = "recoverable";
    }

    return {
      hasError: true,
      error,
      errorType,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    console.error("Image Component Error:", error, errorInfo);

    // 触发震动反馈
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false });
    this.props.onReset?.();

    // 触发震动反馈
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  handleGoBack = () => {
    // 如果需要实现返回功能，可以在这里添加导航逻辑
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
          errorType={this.state.errorType}
          onRetry={this.handleRetry}
          onGoBack={this.handleGoBack}
        />
      );
    }

    return this.props.children;
  }
}

interface ErrorDisplayProps {
  error?: Error;
  errorType?: State["errorType"];
  onRetry: () => void;
  onGoBack: () => void;
}

// 错误显示组件，用于渲染不同类型的错误和相应的操作
const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  errorType = "critical",
  onRetry,
  onGoBack,
}) => {
  const [expanded, setExpanded] = useState(false);
  const scale = useSharedValue(0.95);

  useEffect(() => {
    scale.value = withTiming(1, { duration: 300 });
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const getErrorTitle = () => {
    switch (errorType) {
      case "network":
        return "网络连接错误";
      case "permission":
        return "权限受限";
      case "validation":
        return "数据验证失败";
      case "recoverable":
        return "操作暂时失败";
      default:
        return "出错了";
    }
  };

  const getErrorMessage = () => {
    if (error?.message) return error.message;

    switch (errorType) {
      case "network":
        return "无法连接到网络，请检查您的网络连接并重试";
      case "permission":
        return "应用没有足够的权限执行此操作";
      case "validation":
        return "提供的数据无效或格式不正确";
      case "recoverable":
        return "发生了一个暂时性错误，请重试";
      default:
        return "发生了未知错误，请尝试重新启动应用";
    }
  };

  const getErrorIcon = () => {
    switch (errorType) {
      case "network":
        return <RefreshCw className="h-16 w-16 text-amber-500" />;
      case "permission":
        return <ShieldAlert className="h-16 w-16 text-amber-500" />;
      case "validation":
        return <Info className="h-16 w-16 text-amber-500" />;
      case "recoverable":
        return <RefreshCw className="h-16 w-16 text-blue-500" />;
      default:
        return <AlertTriangle className="h-16 w-16 text-destructive" />;
    }
  };

  const getErrorActions = () => {
    const actions = [];

    // 所有错误类型都有重试按钮
    actions.push(
      <Button
        key="retry"
        onPress={onRetry}
        className="w-full h-12 mb-2"
        variant={errorType === "critical" ? "outline" : "default"}
      >
        <RefreshCw className="h-5 w-5 mr-2" />
        <Text>重试</Text>
      </Button>
    );

    // 对于严重错误，提供返回选项
    if (errorType === "critical") {
      actions.push(
        <Button
          key="back"
          onPress={onGoBack}
          className="w-full h-12"
          variant="default"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          <Text>返回</Text>
        </Button>
      );
    }

    return actions;
  };

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      style={containerStyle}
      className="flex-1 items-center justify-center p-4"
    >
      <Card className="w-full max-w-sm p-6 bg-background/90 backdrop-blur-sm">
        <Animated.View
          entering={ZoomIn.duration(400).delay(100)}
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
            className="text-muted-foreground text-center mb-2"
          >
            {getErrorMessage()}
          </Animated.Text>
        </View>

        {expanded && (
          <Animated.View
            entering={FadeIn.duration(300)}
            className="bg-muted p-3 rounded-md mb-4"
          >
            <ScrollView style={{ maxHeight: 120 }}>
              <Text className="text-xs font-mono text-muted-foreground">
                {error?.stack || "没有可用的错误堆栈"}
              </Text>
            </ScrollView>
          </Animated.View>
        )}

        <Animated.View
          entering={SlideInUp.duration(400).delay(400)}
          className="w-full space-y-3"
        >
          {getErrorActions()}

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
      </Card>
    </Animated.View>
  );
};
