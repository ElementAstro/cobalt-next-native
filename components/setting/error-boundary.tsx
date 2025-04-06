import React, { Component, ErrorInfo } from "react";
import { View, ScrollView } from "react-native";
import { AlertCircle, RefreshCw, AlertTriangle } from "lucide-react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  SlideInUp,
  Layout,
  BounceIn,
  withSpring,
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

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // 更新状态，下一次渲染将显示回退UI
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // 记录错误信息
    this.setState({ errorInfo });
    console.error("Error caught by ErrorBoundary:", error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
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
        >
          <Animated.View
            entering={FadeInDown.duration(500).springify()}
            className="w-full"
          >
          <Card className="native:rounded-2xl native:shadow-lg overflow-hidden border-primary/10">
            <CardHeader className="bg-destructive/10">
              <CardTitle className="flex-row items-center space-x-2">
                <AlertCircle size={24} className="text-destructive" />
                <Text className="text-xl native:text-2xl font-bold text-destructive">
                  出错了
                </Text>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 native:p-5 space-y-4">
              <Alert variant="destructive" icon={AlertCircle}>
                <Text className="font-medium">
                  {this.state.error?.message || "发生未知错误"}
                </Text>
              </Alert>
              <Text className="text-muted-foreground">
                应用遇到了一些问题。您可以尝试重新加载页面，或者返回上一页。
              </Text>

              {this.state.errorInfo && (
                <View className="mt-4 bg-muted p-3 rounded-md">
                  <Text className="text-xs text-muted-foreground font-mono">
                    {this.state.errorInfo.componentStack}
                  </Text>
                </View>
              )}
            </CardContent>
            <CardFooter className="border-t p-4">
              <Button
                className="w-full"
                onPress={this.handleReset}
                variant="default"
              >
                <RefreshCw size={18} className="mr-2" />
                <Text>重试</Text>
              </Button>
            </CardFooter>
          </Card>
        </ScrollView>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

