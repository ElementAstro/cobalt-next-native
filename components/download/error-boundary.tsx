import React, { Component, ErrorInfo, ReactNode } from "react";
import { View, Text, TouchableOpacity } from "react-native";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorView error={this.state.error} />;
    }

    return this.props.children;
  }
}

interface ErrorViewProps {
  error?: Error;
}

export const ErrorView: React.FC<ErrorViewProps> = ({ error }) => {
  return (
    <View className="flex-1 justify-center items-center p-4">
      <Text className="text-xl text-red-500 mb-2">出错了！</Text>
      <Text className="text-gray-600 text-center mb-4">
        {error?.message || "发生了未知错误"}
      </Text>
      <TouchableOpacity
        className="bg-blue-500 px-4 py-2 rounded-lg"
        onPress={() => window.location.reload()}
      >
        <Text className="text-white">重试</Text>
      </TouchableOpacity>
    </View>
  );
};
