import React from "react";
import { View, ScrollView } from "react-native";
import { ErrorBoundary } from "react-error-boundary";
import { AlertCircle, RefreshCw } from "lucide-react-native";
import { Alert, AlertTitle, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import Animated, {
  FadeIn,
  SlideInUp,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

interface FallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

const ErrorFallback = ({ error, resetErrorBoundary }: FallbackProps) => {
  // 动画值
  const cardScale = useSharedValue(1);
  const buttonScale = useSharedValue(1);

  // 动画样式
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  // 处理重试
  const handleRetry = async () => {
    buttonScale.value = withSequence(
      withSpring(0.95),
      withSpring(1)
    );
    
    cardScale.value = withSequence(
      withSpring(0.98),
      withSpring(1)
    );

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    resetErrorBoundary();
  };

  return (
    <Animated.View
      entering={FadeIn.springify()}
      style={cardStyle}
      className="flex-1 bg-background"
    >
      <ScrollView
        className="flex-1 p-6"
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          entering={SlideInUp.springify()}
          className="space-y-6"
        >
          <Alert
            variant="destructive"
            icon={AlertCircle}
            className="mb-6 rounded-2xl border-2 border-destructive/30"
          >
            <AlertCircle className="h-5 w-5" />
            <AlertTitle className="text-lg font-medium">
              预览器出错了
            </AlertTitle>
            <AlertDescription className="text-base mt-2 space-y-2">
              <Text className="text-destructive/90">
                {error.message || "发生了未知错误"}
              </Text>
              {error.stack && (
                <View className="bg-muted/10 p-3 rounded-lg">
                  <Text className="text-xs font-mono text-muted-foreground">
                    {error.stack}
                  </Text>
                </View>
              )}
            </AlertDescription>
          </Alert>

          <Animated.View style={buttonStyle}>
            <Button
              variant="default"
              size="lg"
              className="w-full rounded-xl"
              onPress={handleRetry}
            >
              <RefreshCw className="mr-2 h-5 w-5" />
              重试
            </Button>
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
      }}
    >
      {children}
    </ErrorBoundary>
  );
};