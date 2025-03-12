import React from 'react';
import { View } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { Button } from '~/components/ui/button';
import { Text } from '~/components/ui/text';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('FileSystem Error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View className="flex-1 items-center justify-center p-4">
          <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
          <Text className="text-lg font-semibold mb-2">出错了</Text>
          <Text className="text-muted-foreground text-center mb-4">
            {this.state.error?.message || '发生未知错误'}
          </Text>
          <Button onPress={this.handleRetry}>重试</Button>
        </View>
      );
    }

    return this.props.children;
  }
}
