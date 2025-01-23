"use client";

import React, {
  Component,
  ErrorInfo,
  ReactNode,
  createContext,
  useContext,
  useState,
  useCallback,
} from "react";
import BlueScreen404 from "./BlueScreen404";
import { View, ScrollView } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutUp,
} from "react-native-reanimated";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { Card, CardContent } from "@/components/ui/card";

import { type ErrorBoundaryProps } from "expo-router";

interface ErrorBoundaryContextType {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  resetError: () => void;
}

const ErrorBoundaryContext = createContext<ErrorBoundaryContextType>({
  error: null,
  errorInfo: null,
  resetError: () => {},
});

export const useErrorBoundary = () => useContext(ErrorBoundaryContext);

interface Props extends Partial<ErrorBoundaryProps> {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  customClassName?: string;
  showErrorDetails?: boolean;
  theme?: "light" | "dark";
  reportError?: (error: Error, errorInfo: ErrorInfo) => Promise<void>;
  maxRetries?: number;
  customLogger?: (error: Error, errorInfo: ErrorInfo) => void;
  language?: "en" | "zh";
  getSuggestion?: (error: Error) => string;
  useBlueScreen?: boolean;
  resetKeys?: any[];
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  isReporting: boolean;
  retryCount: number;
  errorTime?: Date;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, isReporting: false, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error, errorTime: new Date() };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    if (this.props.customLogger) {
      this.props.customLogger(error, errorInfo);
    }
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.hasError) {
      if (
        this.props.resetKeys &&
        JSON.stringify(prevProps.resetKeys) !==
          JSON.stringify(this.props.resetKeys)
      ) {
        this.setState({
          hasError: false,
          error: undefined,
          errorInfo: undefined,
          retryCount: 0,
        });
      }
    }
  }

  handleReportError = async () => {
    if (this.props.reportError && this.state.error && this.state.errorInfo) {
      this.setState({ isReporting: true });
      try {
        await this.props.reportError(this.state.error, this.state.errorInfo);
        alert(this.getTranslation("errorReported"));
      } catch (e) {
        alert(this.getTranslation("reportErrorFailed"));
      } finally {
        this.setState({ isReporting: false });
      }
    }
  };

  handleRetry = () => {
    if (this.props.retry) {
      // 使用 Expo Router 提供的 retry 函数
      this.props.retry();
    } else {
      // fallback 到原有的重试逻辑
      const { maxRetries = 3 } = this.props;
      if (this.state.retryCount < maxRetries) {
        this.setState((prevState) => ({
          hasError: false,
          error: undefined,
          errorInfo: undefined,
          retryCount: prevState.retryCount + 1,
        }));
      } else {
        alert(this.getTranslation("maxRetriesReached"));
      }
    }
  };

  handleClose = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      retryCount: 0,
    });
  };

  getTranslation = (key: string): string => {
    const translations: Record<string, Record<string, string>> = {
      en: {
        errorOccurred: "Oops, an error occurred!",
        errorDetails: "View error details",
        retry: "Retry",
        reportError: "Report Error",
        errorReported: "Error reported successfully, thank you!",
        reportErrorFailed:
          "There was a problem reporting the error. Please try again later.",
        maxRetriesReached:
          "Maximum retry attempts reached. Please refresh the page.",
        errorTime: "Error occurred at:",
        close: "Close",
      },
      zh: {
        errorOccurred: "哎呀，出错了！",
        errorDetails: "查看错误详情",
        retry: "重试",
        reportError: "报告错误",
        errorReported: "错误已成功报告，谢谢！",
        reportErrorFailed: "报告错误时出现问题，请稍后再试。",
        maxRetriesReached: "已达到最大重试次数。请刷新页面。",
        errorTime: "错误发生时间：",
        close: "关闭",
      },
    };
    return translations[this.props.language || "en"][key] || key;
  };

  render(): ReactNode {
    const { children, useBlueScreen = true } = this.props;
    const { hasError, error, errorInfo } = this.state;

    if (hasError) {
      if (useBlueScreen) {
        return (
          <BlueScreen404
            error={error}
            errorInfo={errorInfo}
            isErrorBoundary={true}
          />
        );
      }

      const { theme = "dark" } = this.props;

      return (
        <>
          {children}
          <Animated.View
            className="absolute inset-0 z-50 flex-1 items-center justify-center p-4 bg-black/50"
            entering={FadeIn.springify()}
            exiting={FadeOut.duration(200)}
          >
            <Animated.View
              className={`w-full max-w-md p-6 rounded-lg shadow-lg ${
                theme === "light" ? "bg-white" : "bg-gray-800"
              }`}
              entering={SlideInDown.springify()}
              exiting={SlideOutUp.springify()}
            >
              <Text className="text-2xl font-bold mb-4">
                {this.getTranslation("errorOccurred")}
              </Text>

              <Text className="mb-4 text-base">{error?.message}</Text>

              {this.state.errorTime && (
                <Text className="mb-4 text-sm">
                  {this.getTranslation("errorTime")}{" "}
                  {this.state.errorTime.toLocaleString()}
                </Text>
              )}

              {this.props.showErrorDetails && (
                <Card className="mt-4 mb-4">
                  <CardContent>
                    <ScrollView className="max-h-32">
                      <Text className="text-xs font-mono">
                        {errorInfo?.componentStack}
                      </Text>
                    </ScrollView>
                  </CardContent>
                </Card>
              )}

              {this.props.getSuggestion && error && (
                <Text className="mb-4 text-base font-semibold">
                  {this.props.getSuggestion(error)}
                </Text>
              )}

              <View className="flex-row flex-wrap gap-2">
                <Button variant="default" onPress={this.handleRetry}>
                  <Text>
                    {this.getTranslation("retry")} ({this.state.retryCount}/
                    {this.props.maxRetries || 3})
                  </Text>
                </Button>

                {this.props.reportError && (
                  <Button
                    variant="secondary"
                    onPress={this.handleReportError}
                    disabled={this.state.isReporting}
                  >
                    <Text>
                      {this.state.isReporting
                        ? "..."
                        : this.getTranslation("reportError")}
                    </Text>
                  </Button>
                )}

                <Button variant="outline" onPress={this.handleClose}>
                  <Text>{this.getTranslation("close")}</Text>
                </Button>
              </View>
            </Animated.View>
          </Animated.View>
        </>
      );
    }

    return children;
  }
}

export const ErrorBoundaryProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [error, setError] = useState<Error | null>(null);
  const [errorInfo, setErrorInfo] = useState<ErrorInfo | null>(null);

  const resetError = useCallback(() => {
    setError(null);
    setErrorInfo(null);
  }, []);

  return (
    <ErrorBoundaryContext.Provider value={{ error, errorInfo, resetError }}>
      <ErrorBoundary>{children}</ErrorBoundary>
    </ErrorBoundaryContext.Provider>
  );
};

// 添加 Expo Router 兼容的错误边界导出
export function ExpoErrorBoundary({
  error,
  retry,
  children,
}: ErrorBoundaryProps & { children: ReactNode }) {
  return (
    <ErrorBoundary
      error={error}
      retry={retry}
      useBlueScreen={false}
      theme="dark"
      language="zh"
    >
      {children}
    </ErrorBoundary>
  );
}

export default ErrorBoundary;
