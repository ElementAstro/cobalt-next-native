import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { View } from "react-native";
import { Text } from "~/components/ui/text";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { AlertTriangle, RefreshCw } from "lucide-react-native";

interface Props {
  children: ReactNode;
  fallback?: (error: Error, errorInfo: ErrorInfo, onReset: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

interface ErrorViewProps {
  error: Error;
  errorInfo: ErrorInfo;
  onReset: () => void;
}

const DefaultErrorView: React.FC<ErrorViewProps> = ({ error, errorInfo, onReset }) => (
  <View className="flex-1 justify-center items-center p-4 bg-background">
    <Card className="w-full max-w-md">
      <CardHeader className="items-center">
        <AlertTriangle size={48} className="text-destructive mb-2" />
        <CardTitle className="text-center text-destructive">出现错误</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Text className="text-sm text-muted-foreground text-center">
          应用程序遇到了一个意外错误。您可以尝试重新加载页面。
        </Text>
        
        <View className="bg-muted p-3 rounded-md">
          <Text className="text-xs font-mono text-foreground">
            {error.message}
          </Text>
        </View>
        
        <Button 
          onPress={onReset}
          className="w-full"
          variant="outline"
        >
          <RefreshCw size={16} className="mr-2" />
          重新加载
        </Button>
        
        {__DEV__ && (
          <View className="mt-4">
            <Text className="text-xs font-semibold mb-2">调试信息:</Text>
            <View className="bg-muted p-2 rounded-md max-h-32">
              <Text className="text-xs font-mono text-muted-foreground">
                {errorInfo.componentStack}
              </Text>
            </View>
          </View>
        )}
      </CardContent>
    </Card>
  </View>
);

class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Call the onError callback if provided
    this.props.onError?.(error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public override render() {
    if (this.state.hasError && this.state.error && this.state.errorInfo) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.state.errorInfo, this.handleReset);
      }

      // Use default error view
      return (
        <DefaultErrorView
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onReset={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
export { DefaultErrorView };
export type { ErrorViewProps };
