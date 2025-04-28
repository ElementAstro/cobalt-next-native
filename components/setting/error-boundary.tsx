import React, { Component, ErrorInfo } from "react";
import { View, ScrollView, Pressable } from "react-native";
import { AlertCircle, RefreshCw, XCircle, ArrowLeft } from "lucide-react-native";
import Animated, { 
  FadeInDown, 
  FadeOut, 
  SlideInUp, 
  ZoomIn, 
  Layout,
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  interpolate,
  withSequence,
  withTiming
} from "react-native-reanimated";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "~/components/ui/card";
import { Alert } from "~/components/ui/alert";
import * as Haptics from "expo-haptics";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isRetrying: boolean;
}

const AnimatedErrorMessage = ({ 
  error, 
  errorInfo 
}: { 
  error: string; 
  errorInfo?: ErrorInfo | null 
}) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(scale.value) }],
    opacity: withSpring(opacity.value),
  }));

  const onPressIn = () => {
    scale.value = withSpring(0.98);
    opacity.value = withSpring(0.9);
  };

  const onPressOut = () => {
    scale.value = withSpring(1);
    opacity.value = withSpring(1);
  };

  return (
    <Pressable onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View 
        style={animatedStyle}
        className="mt-4 bg-muted p-3 rounded-md overflow-hidden border border-border/10"
      >
        <Animated.View 
          entering={FadeInDown.delay(400).duration(500).springify()} 
          className="bg-destructive/5 mb-2 p-2 rounded-md"
        >
          <Text className="font-medium text-destructive">{error}</Text>
        </Animated.View>

        {errorInfo && (
          <Animated.View 
            entering={FadeInDown.delay(600).duration(500).springify()}
          >
            <Text className="text-xs text-muted-foreground font-mono">
              {errorInfo.componentStack}
            </Text>
          </Animated.View>
        )}
      </Animated.View>
    </Pressable>
  );
};

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isRetrying: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // 更新状态，下一次渲染将显示回退UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // 记录错误信息
    this.setState({ errorInfo });
    console.error("Error caught by ErrorBoundary:", error, errorInfo);
  }

  handleReset = async (): Promise<void> => {
    try {
      this.setState({ isRetrying: true });
      
      // 触觉反馈
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // 延迟重置以便动画有时间完成
      setTimeout(() => {
        this.setState({ 
          hasError: false, 
          error: null, 
          errorInfo: null,
          isRetrying: false 
        });
        
        // 如果提供了外部重置回调，则调用它
        if (this.props.onReset) {
          this.props.onReset();
        }
      }, 500);
    } catch (err) {
      this.setState({ isRetrying: false });
      console.error("Reset error:", err);
    }
  };

  handleGoBack = async (): Promise<void> => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      // 在实际应用中，这里可以添加返回上一页的逻辑
    } catch (err) {
      console.error("Navigation error:", err);
    }
  };

  render() {
    if (this.state.hasError) {
      // 自定义回退UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 默认回退UI
      return (
        <ScrollView
          contentContainerStyle={{ flex: 1, padding: 16 }}
          className="flex-1 bg-gradient-to-b from-background to-background/95"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            entering={SlideInUp.duration(600).springify()}
            className="w-full"
          >
            <Card className="native:rounded-2xl native:shadow-lg overflow-hidden border-primary/10">
              <CardHeader className="bg-destructive/10 border-b border-destructive/20">
                <CardTitle className="flex-row items-center justify-between">
                  <Animated.View 
                    entering={ZoomIn.delay(300).duration(500).springify()}
                    className="flex-row items-center space-x-2"
                  >
                    <AlertCircle size={24} className="text-destructive" />
                    <Text className="text-xl native:text-2xl font-bold text-destructive">
                      出错了
                    </Text>
                  </Animated.View>
                  
                  <Pressable 
                    onPress={this.handleGoBack}
                    className="p-2 bg-destructive/20 rounded-full active:opacity-70"
                    accessibilityRole="button"
                    accessibilityLabel="返回上一页"
                    accessibilityHint="点击返回上一页"
                  >
                    <ArrowLeft size={18} className="text-destructive" />
                  </Pressable>
                </CardTitle>
              </CardHeader>
              
              <CardContent className="p-4 native:p-5 space-y-4">
                <Animated.View
                  entering={FadeInDown.delay(200).duration(500).springify()}
                  layout={Layout.springify()}
                >
                  <Alert variant="destructive" icon={AlertCircle} className="native:rounded-xl">
                    <Text className="font-medium">
                      {this.state.error?.message || "发生未知错误"}
                    </Text>
                  </Alert>
                </Animated.View>
                
                <Animated.View
                  entering={FadeInDown.delay(300).duration(500).springify()}
                >
                  <Text className="text-muted-foreground">
                    应用遇到了一些问题。您可以尝试重新加载页面，或者返回上一页。
                  </Text>
                </Animated.View>

                {this.state.errorInfo && (
                  <AnimatedErrorMessage 
                    error={this.state.error?.message || "未知错误"} 
                    errorInfo={this.state.errorInfo} 
                  />
                )}
              </CardContent>
              
              <CardFooter className="border-t p-4 space-x-3 native:p-5">
                <Button
                  className="flex-1 h-11 native:h-12 native:rounded-xl"
                  onPress={this.handleReset}
                  variant="default"
                  disabled={this.state.isRetrying}
                  accessibilityRole="button"
                  accessibilityLabel="重试"
                  accessibilityHint="点击重新加载页面"
                >
                  <RefreshCw 
                    size={18} 
                    className={`mr-2 ${this.state.isRetrying ? 'animate-spin' : ''}`} 
                  />
                  <Text>{this.state.isRetrying ? "重新加载中..." : "重试"}</Text>
                </Button>
                
                <Button
                  className="flex-1 h-11 native:h-12 native:rounded-xl"
                  onPress={this.handleGoBack}
                  variant="outline"
                  accessibilityRole="button"
                  accessibilityLabel="返回"
                  accessibilityHint="点击返回上一页"
                >
                  <XCircle size={18} className="mr-2" />
                  <Text>返回</Text>
                </Button>
              </CardFooter>
            </Card>
          </Animated.View>
        </ScrollView>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
