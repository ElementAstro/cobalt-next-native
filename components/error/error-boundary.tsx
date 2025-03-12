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
import BlueScreen404 from "./blue-screen-404";
import { View, ScrollView } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInUp,
  SlideOutDown,
  withSpring,
  withSequence,
  withTiming,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import { Card, CardContent } from "~/components/ui/card";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

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
          <ErrorOverlay
            error={error}
            errorInfo={errorInfo}
            errorTime={this.state.errorTime}
            theme={theme}
            showErrorDetails={this.props.showErrorDetails}
            getSuggestion={this.props.getSuggestion}
            retryCount={this.state.retryCount}
            maxRetries={this.props.maxRetries}
            isReporting={this.state.isReporting}
            onRetry={this.handleRetry}
            onReport={this.handleReportError}
            onClose={this.handleClose}
            getTranslation={this.getTranslation}
          />
        </>
      );
    }

    return children;
  }
}

// 新增 ErrorOverlay 的 Props 接口
interface ErrorOverlayProps {
  error?: Error;
  errorInfo?: ErrorInfo;
  errorTime?: Date;
  theme: "light" | "dark";
  showErrorDetails?: boolean;
  getSuggestion?: (error: Error) => string;
  retryCount: number;
  maxRetries?: number;
  isReporting: boolean;
  onRetry: () => void;
  onReport: () => void;
  onClose: () => void;
  getTranslation: (key: string) => string;
}

// 使用新的接口定义 ErrorOverlay 组件
const ErrorOverlay: React.FC<ErrorOverlayProps> = React.memo(
  ({
    error,
    errorInfo,
    errorTime,
    theme,
    showErrorDetails,
    getSuggestion,
    retryCount,
    maxRetries,
    isReporting,
    onRetry,
    onReport,
    onClose,
    getTranslation,
  }) => {
    const insets = useSafeAreaInsets();
    const overlayScale = useSharedValue(0.95);
    const overlayOpacity = useSharedValue(0);

    React.useEffect(() => {
      overlayScale.value = withSpring(1, {
        damping: 15,
        stiffness: 100,
      });
      overlayOpacity.value = withTiming(1, {
        duration: 300,
      });
    }, []);

    const overlayStyle = useAnimatedStyle(() => ({
      transform: [{ scale: overlayScale.value }],
      opacity: overlayOpacity.value,
    }));

    const handleButtonPress = async (action: () => void) => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      overlayScale.value = withSequence(
        withSpring(0.98, { stiffness: 500 }),
        withSpring(1, { stiffness: 500 })
      );
      action();
    };

    return (
      <Animated.View
        className="absolute inset-0 flex-1 items-center justify-center bg-black/60 backdrop-blur-sm"
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(150)}
        style={{
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        }}
      >
        <Animated.View
          className={`w-[90%] max-w-md rounded-2xl shadow-2xl ${
            theme === "light" ? "bg-white" : "bg-gray-900"
          }`}
          entering={SlideInUp.springify()}
          exiting={SlideOutDown.springify()}
          style={overlayStyle}
        >
          <View className="p-6 space-y-4">
            <View>
              <Text className="text-2xl font-bold mb-2">
                {getTranslation("errorOccurred")}
              </Text>
              <Text className="text-base text-muted-foreground">
                {error?.message}
              </Text>
            </View>

            {errorTime && (
              <Text className="text-sm text-muted-foreground">
                {getTranslation("errorTime")} {errorTime.toLocaleString()}
              </Text>
            )}

            {showErrorDetails && (
              <Card className="overflow-hidden border-0">
                <CardContent className="p-0">
                  <ScrollView
                    className="max-h-32 p-4 bg-muted/50 rounded-lg"
                    showsVerticalScrollIndicator={false}
                  >
                    <Text className="text-xs font-mono leading-relaxed">
                      {errorInfo?.componentStack}
                    </Text>
                  </ScrollView>
                </CardContent>
              </Card>
            )}

            {getSuggestion && error && (
              <Text className="text-base font-medium text-primary">
                {getSuggestion(error)}
              </Text>
            )}

            <View className="flex-row flex-wrap gap-3 pt-2">
              <Button
                variant="default"
                className="flex-1 h-12 rounded-xl"
                onPress={() => handleButtonPress(onRetry)}
              >
                <Text className="text-base font-medium">
                  {getTranslation("retry")} ({retryCount}/{maxRetries || 3})
                </Text>
              </Button>

              {onReport && (
                <Button
                  variant="secondary"
                  className="flex-1 h-12 rounded-xl"
                  onPress={() => handleButtonPress(onReport)}
                  disabled={isReporting}
                >
                  <Text className="text-base font-medium">
                    {isReporting ? "..." : getTranslation("reportError")}
                  </Text>
                </Button>
              )}

              <Button
                variant="outline"
                className="w-full h-12 rounded-xl"
                onPress={() => handleButtonPress(onClose)}
              >
                <Text className="text-base font-medium">
                  {getTranslation("close")}
                </Text>
              </Button>
            </View>
          </View>
        </Animated.View>
      </Animated.View>
    );
  }
);

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
