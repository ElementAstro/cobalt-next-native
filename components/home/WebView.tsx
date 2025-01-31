import React, { useState, useCallback } from "react";
import { View, Dimensions, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from "react-native-reanimated";
import {
  RefreshCw,
  AlertCircle,
  Smartphone,
  Monitor,
  XCircle,
} from "lucide-react-native";
import { toast } from "sonner-native";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useAppStore } from "@/stores/useHomeStore";
import { useOrientation } from "@/hooks/useOrientation";

interface DeviceConfig {
  name: string;
  width: number;
  height: number;
  userAgent?: string;
}

const DEFAULT_DEVICES: Record<string, DeviceConfig> = {
  responsive: {
    name: "自适应",
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height,
  },
  iphone12: {
    name: "iPhone 12",
    width: 390,
    height: 844,
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)",
  },
  ipad: {
    name: "iPad",
    width: 810,
    height: 1080,
    userAgent: "Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)",
  },
};

interface CustomWebViewProps {
  url: string;
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
  onError?: (error: any) => void;
  startInLoadingState?: boolean;
  scalesPageToFit?: boolean;
  javaScriptEnabled?: boolean;
  domStorageEnabled?: boolean;
  initialDevice?: string;
  customDevices?: Record<string, DeviceConfig>;
  customParams?: Record<string, string>;
}

export const CustomWebView: React.FC<CustomWebViewProps> = ({
  url,
  onLoadStart,
  onLoadEnd,
  onError,
  startInLoadingState = true,
  scalesPageToFit = true,
  javaScriptEnabled = true,
  domStorageEnabled = true,
  initialDevice = "responsive",
  customDevices = {},
  customParams = {},
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [key, setKey] = useState(0);

  const { isFullscreen, currentDevice, setFullscreen, setCurrentDevice } = useAppStore();
  const isLandscape = useOrientation();

  const devices = { ...DEFAULT_DEVICES, ...customDevices };

  const getUrlWithParams = useCallback(
    (baseUrl: string) => {
      const params = new URLSearchParams(customParams);
      return `${baseUrl}${
        baseUrl.includes("?") ? "&" : "?"
      }${params.toString()}`;
    },
    [customParams]
  );

  const handleLoadStart = useCallback(() => {
    setError(null);
    onLoadStart?.();
    setLoading(true);
  }, [onLoadStart]);

  const handleLoadEnd = useCallback(() => {
    onLoadEnd?.();
    setLoading(false);
    toast.success("加载成功");
  }, [onLoadEnd]);

  const handleError = useCallback(
    (err: any) => {
      setError(err);
      onError?.(err);
      setLoading(false);
      toast.error("加载失败", {
        description: err.message,
      });
    },
    [onError]
  );

  const handleReload = useCallback(() => {
    setKey((prev) => prev + 1);
    setError(null);
  }, []);

  const handleDeviceChange = useCallback((deviceKey: string) => {
    setCurrentDevice(deviceKey);
    setKey((prev) => prev + 1);
  }, [setCurrentDevice]);

  const toggleFullscreen = useCallback(() => {
    setFullscreen(!isFullscreen);
  }, [isFullscreen, setFullscreen]);

  const deviceConfig = devices[currentDevice];

  return (
    <View className="flex-1 bg-background">
      {!isFullscreen && (
        <View className={`
          flex-row flex-wrap p-2 border-b border-border
          ${isLandscape ? 'items-center justify-center' : ''}
        `}>
          {Object.entries(devices).map(([key, device]) => (
            <Button
              key={key}
              variant={currentDevice === key ? "default" : "outline"}
              size="sm"
              className={`
                m-1
                ${isLandscape ? 'min-w-[120px]' : 'flex-1'}
              `}
              onPress={() => handleDeviceChange(key)}
            >
              {key === "responsive" ? (
                <Monitor className="mr-1 h-4 w-4" />
              ) : (
                <Smartphone className="mr-1 h-4 w-4" />
              )}
              <Text>{device.name}</Text>
            </Button>
          ))}
        </View>
      )}

      <View className={`
        flex-1 items-center justify-center
        ${isLandscape ? 'px-4' : ''}
      `}>
        <View
          style={[
            {
              width: isFullscreen ? '100%' : (
                isLandscape ? 
                  Math.min(deviceConfig.width, Dimensions.get('window').width * 0.8) :
                  deviceConfig.width
              ),
              height: isFullscreen ? '100%' : (
                isLandscape ?
                  Math.min(deviceConfig.height, Dimensions.get('window').height * 0.9) :
                  deviceConfig.height
              ),
              maxWidth: "100%",
              maxHeight: "100%",
            },
            styles.container
          ]}
        >
          {/* Exit Fullscreen Button */}
          {isFullscreen && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 z-10"
              onPress={toggleFullscreen}
            >
              <XCircle className="h-6 w-6" />
            </Button>
          )}

          {loading && (
            <Animated.View
              entering={FadeIn}
              exiting={FadeOut}
              className="absolute inset-0 justify-center items-center bg-background/80"
            >
              <Animated.View layout={LinearTransition} className="items-center">
                <RefreshCw className="animate-spin" size={24} color="#007bff" />
                <Text className="mt-2 text-lg text-foreground">加载中...</Text>
              </Animated.View>
            </Animated.View>
          )}

          {error ? (
            <Animated.View
              entering={FadeIn}
              className="flex-1 justify-center items-center p-4"
            >
              <AlertCircle size={48} className="text-destructive mb-4" />
              <Text className="text-lg text-destructive text-center mb-4">
                {error.message || "加载失败"}
              </Text>
              <Button
                variant="default"
                size="lg"
                onPress={handleReload}
                className="w-32"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                <Text>重试</Text>
              </Button>
            </Animated.View>
          ) : (
            <WebView
              key={key}
              source={{ uri: getUrlWithParams(url) }}
              className="flex-1"
              style={{
                width: isFullscreen ? '100%' : deviceConfig.width,
                height: isFullscreen ? '100%' : deviceConfig.height,
              }}
              onLoadStart={handleLoadStart}
              onLoad={handleLoadEnd}
              onError={handleError}
              javaScriptEnabled={javaScriptEnabled}
              domStorageEnabled={domStorageEnabled}
              scalesPageToFit={scalesPageToFit}
              startInLoadingState={startInLoadingState}
              userAgent={deviceConfig.userAgent}
            />
          )}
        </View>

        {!isFullscreen && (
          <Button
            variant="default"
            size="sm"
            className={`
              mt-4
              ${isLandscape ? 'absolute right-4 top-4' : ''}
            `}
            onPress={toggleFullscreen}
          >
            <Monitor className="mr-2 h-4 w-4" />
            <Text>全屏查看</Text>
          </Button>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: 'background',
    borderWidth: 1,
    borderColor: 'border',
    overflow: 'hidden',
  }
});
