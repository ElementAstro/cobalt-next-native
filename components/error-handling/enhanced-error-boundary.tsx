/**
 * Enhanced error boundary with centralized error handling
 * Provides graceful error recovery and user feedback
 */

import React, { Component, type ReactNode } from 'react';
import { View, ScrollView } from 'react-native';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react-native';
import { Text } from '~/components/ui/text';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { EnhancedButton } from '~/components/ui/enhanced-button';
import { ErrorManager } from '~/lib/error-handling/error-manager';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorId: string | null;
  retryCount: number;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, errorInfo: React.ErrorInfo, retry: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  level?: 'app' | 'screen' | 'component';
  source?: string;
  enableRetry?: boolean;
  maxRetries?: number;
}

export class EnhancedErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private errorManager = ErrorManager.getInstance();

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { source = 'ErrorBoundary', onError } = this.props;
    
    // Log error to centralized error manager
    const errorId = this.errorManager.logJSError(error, source, {
      screen: 'Unknown', // Could be enhanced with navigation context
      action: 'Component Render',
    });

    this.setState({
      errorInfo,
      errorId,
    });

    // Call custom error handler if provided
    onError?.(error, errorInfo);

    // Log to console in development
    if (__DEV__) {
      console.error('Error Boundary caught an error:', error);
      console.error('Error Info:', errorInfo);
    }
  }

  handleRetry = () => {
    const { maxRetries = 3 } = this.props;
    const { retryCount, errorId } = this.state;

    if (retryCount < maxRetries) {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: retryCount + 1,
      });

      // Log retry attempt
      if (errorId) {
        this.errorManager.retryError(errorId);
      }
    }
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
    });
  };

  handleReportError = () => {
    const { error, errorInfo } = this.state;
    if (error && errorInfo) {
      // In a real app, this would send the error to a reporting service
      const errorReport = this.errorManager.exportErrors();
      console.log('Error Report:', errorReport);
      
      // Could also copy to clipboard or share
      alert('Error report generated. Check console for details.');
    }
  };

  override render() {
    const { hasError, error, errorInfo, retryCount } = this.state;
    const { children, fallback, level = 'component', enableRetry = true, maxRetries = 3 } = this.props;

    if (hasError && error) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback(error, errorInfo!, this.handleRetry);
      }

      // Default error UI based on level
      return this.renderDefaultErrorUI(error, errorInfo!, retryCount, maxRetries, enableRetry, level);
    }

    return children;
  }

  private renderDefaultErrorUI(
    error: Error,
    errorInfo: React.ErrorInfo,
    retryCount: number,
    maxRetries: number,
    enableRetry: boolean,
    level: string
  ) {
    const canRetry = enableRetry && retryCount < maxRetries;
    const isAppLevel = level === 'app';

    return (
      <View className="flex-1 bg-background p-4 justify-center">
        <Card className="max-w-md mx-auto">
          <CardHeader className="items-center">
            <View className="w-16 h-16 rounded-full bg-red-100 items-center justify-center mb-4">
              <AlertTriangle size={32} className="text-red-600" />
            </View>
            <CardTitle className="text-center">
              {isAppLevel ? 'Application Error' : 'Something went wrong'}
            </CardTitle>
            <CardDescription className="text-center">
              {isAppLevel 
                ? 'The application encountered an unexpected error'
                : 'This section of the app encountered an error'
              }
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Error Message */}
            <View className="p-3 bg-red-50 rounded-lg border border-red-200">
              <Text className="text-sm text-red-800 font-medium mb-1">
                Error Details:
              </Text>
              <Text className="text-sm text-red-700">
                {error.message}
              </Text>
            </View>

            {/* Retry Information */}
            {retryCount > 0 && (
              <View className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                <Text className="text-sm text-orange-800">
                  Retry attempt {retryCount} of {maxRetries}
                </Text>
              </View>
            )}

            {/* Action Buttons */}
            <View className="space-y-2">
              {canRetry && (
                <EnhancedButton
                  variant="primary"
                  onPress={this.handleRetry}
                  leftIcon={<RefreshCw size={16} />}
                  className="w-full"
                >
                  Try Again
                </EnhancedButton>
              )}
              
              <EnhancedButton
                variant="outline"
                onPress={this.handleReset}
                leftIcon={<Home size={16} />}
                className="w-full"
              >
                {isAppLevel ? 'Restart App' : 'Reset Component'}
              </EnhancedButton>
              
              {__DEV__ && (
                <EnhancedButton
                  variant="ghost"
                  onPress={this.handleReportError}
                  leftIcon={<Bug size={16} />}
                  className="w-full"
                >
                  Report Error
                </EnhancedButton>
              )}
            </View>

            {/* Development Info */}
            {__DEV__ && (
              <View className="mt-4">
                <Text className="text-sm font-medium mb-2">Development Info:</Text>
                <ScrollView className="max-h-32 p-2 bg-gray-100 rounded">
                  <Text className="text-xs font-mono">
                    {error.stack}
                  </Text>
                </ScrollView>
              </View>
            )}
          </CardContent>
        </Card>
      </View>
    );
  }
}

/**
 * HOC for wrapping components with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <EnhancedErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </EnhancedErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

/**
 * Hook for programmatic error boundary control
 */
export function useErrorBoundary(): {
  captureError: (error: Error, errorInfo?: any) => void;
} {
  const captureError = (error: Error, errorInfo?: any) => {
    // This would trigger the nearest error boundary
    throw error;
  };

  return { captureError };
}
