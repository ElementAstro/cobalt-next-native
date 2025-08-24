import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { AlertTriangle, RefreshCw, ChevronDown, ChevronUp } from "lucide-react-native";
import Animated, { 
  FadeInDown, 
  FadeIn, 
  SlideInUp,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing
} from "react-native-reanimated";
import { Button } from "../ui/button";
import { Alert } from "../ui/alert";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    
    // 将错误信息传递给可选的错误处理回调
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    
    // 记录错误到控制台
    console.error("Error caught by boundary:", error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false });
  };

  override render() {
    if (this.state.hasError) {
      // 使用自定义的 fallback 或默认的错误视图
      return this.props.fallback || (
        <ErrorView
          error={this.state.error!}
          errorInfo={this.state.errorInfo!}
          onReset={this.resetError}
        />
      );
    }

    return this.props.children;
  }
}

interface ErrorViewProps {
  error: Error;
  errorInfo: ErrorInfo;
  onReset: () => void;
}

export const ErrorView: React.FC<ErrorViewProps> = ({ error, errorInfo, onReset }) => {
  const [showDetails, setShowDetails] = React.useState(false);
  const detailsHeight = useSharedValue(0);
  
  React.useEffect(() => {
    detailsHeight.value = withTiming(
      showDetails ? 200 : 0, 
      { duration: 300, easing: Easing.bezier(0.4, 0.0, 0.2, 1) }
    );
  }, [showDetails]);
  
  const detailsStyle = useAnimatedStyle(() => {
    return {
      height: detailsHeight.value,
      opacity: showDetails ? withTiming(1, { duration: 300 }) : withTiming(0, { duration: 200 })
    };
  });

  return (
    <Animated.View 
      entering={FadeInDown.duration(500)}
      className="flex-1 justify-center items-center p-6 bg-background"
      accessibilityRole="alert"
      accessibilityLabel="错误信息"
    >
      <Animated.View entering={SlideInUp.delay(100)}>
        <Alert variant="destructive" className="mb-6 w-full">
          <View className="items-center">
            <AlertTriangle size={40} className="text-destructive mb-4" />
            <Text className="text-xl font-bold text-destructive mb-2">
              出错了！
            </Text>
            <Text className="text-gray-600 text-center mb-6">
              {error?.message || "发生了未知错误"}
            </Text>
          </View>
        </Alert>
      </Animated.View>

      <Animated.View 
        style={detailsStyle}
        className="overflow-hidden w-full rounded-md bg-gray-100 mb-6"
      >
        <ScrollView className="p-3">
          <Text className="font-medium mb-2">错误详情:</Text>
          <Text className="font-mono text-xs text-gray-700">
            {error?.stack || "无堆栈信息可用"}
            {"\n\n"}
            {errorInfo ? errorInfo.componentStack : "无组件堆栈信息"}
          </Text>
        </ScrollView>
      </Animated.View>

      <View className="flex-row space-x-3 mb-4">
        <Button
          onPress={() => setShowDetails(!showDetails)}
          variant="outline"
          className="flex-row items-center"
          accessibilityHint={showDetails ? "隐藏错误详情" : "显示错误详情"}
          accessibilityRole="button"
        >
          {showDetails ? (
            <>
              <ChevronUp size={16} className="mr-1" />
              <Text>隐藏详情</Text>
            </>
          ) : (
            <>
              <ChevronDown size={16} className="mr-1" />
              <Text>查看详情</Text>
            </>
          )}
        </Button>
        
        <Button
          onPress={onReset}
          variant="default"
          className="flex-row items-center"
          accessibilityHint="尝试重置错误并重新加载组件"
          accessibilityRole="button"
        >
          <RefreshCw size={16} className="mr-1" />
          <Text className="text-white">重试</Text>
        </Button>
      </View>
      
      <Animated.View entering={FadeIn.delay(500)}>
        <Text className="text-xs text-gray-500 text-center">
          如果问题持续存在，请尝试重启应用或联系支持团队
        </Text>
      </Animated.View>
    </Animated.View>
  );
};
