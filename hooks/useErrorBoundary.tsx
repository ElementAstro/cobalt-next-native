import React, { createContext, useContext, useState, useCallback } from "react";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import { toast } from "sonner-native";
import { AlertCircle, Info } from "lucide-react-native";

interface ErrorBoundaryContextType {
  error: Error | null;
  setError: (error: Error | null) => void;
  handleError: (error: unknown, action?: string) => void;
  clearError: () => void;
}

const ErrorBoundaryContext = createContext<ErrorBoundaryContextType>({
  error: null,
  setError: () => {},
  handleError: () => {},
  clearError: () => {},
});

export const ErrorBoundaryProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [error, setError] = useState<Error | null>(null);

  const handleError = useCallback(async (error: unknown, action?: string) => {
    if (Platform.OS !== "web") {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }

    let errorMessage: string;

    if (error instanceof Error) {
      errorMessage = error.message;
      setError(error);
    } else if (typeof error === "string") {
      errorMessage = error;
      setError(new Error(error));
    } else {
      errorMessage = "发生未知错误";
      setError(new Error("Unknown error"));
    }

    // 显示错误消息
    toast.error(action || "操作失败", {
      description: errorMessage,
      icon: <AlertCircle size={20} className="text-destructive" />,
    });

    // 记录错误到控制台
    console.error(`Error during ${action || "operation"}:`, error);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <ErrorBoundaryContext.Provider
      value={{ error, setError, handleError, clearError }}
    >
      {children}
    </ErrorBoundaryContext.Provider>
  );
};

export const useErrorBoundary = () => {
  const context = useContext(ErrorBoundaryContext);

  if (!context) {
    console.warn(
      "useErrorBoundary must be used within an ErrorBoundaryProvider"
    );

    // 提供一个默认实现，避免应用崩溃
    return {
      error: null,
      setError: () => {},
      handleError: (error: unknown, action?: string) => {
        console.error(`Error during ${action || "operation"}:`, error);

        toast.error("操作失败", {
          description: error instanceof Error ? error.message : "未知错误",
          icon: <Info size={20} className="text-destructive" />,
        });
      },
      clearError: () => {},
    };
  }

  return context;
};

export default useErrorBoundary;
