import React, {
  useState,
  useCallback,
  forwardRef,
  useEffect,
  useRef,
} from "react";
import {
  View,
  Dimensions,
  StyleSheet,
  Pressable,
  ScrollView,
} from "react-native";
import { WebView, WebViewProps } from "react-native-webview";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInUp,
  SlideOutDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withSequence,
  interpolate,
  Extrapolate,
  Easing,
  useAnimatedGestureHandler,
} from "react-native-reanimated";
import {
  RefreshCw,
  AlertCircle,
  Smartphone,
  Monitor,
  XCircle,
  Maximize2,
  Minimize2,
  ExternalLink,
} from "lucide-react-native";
import { toast } from "sonner-native";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import { useHomeStore } from "~/stores/useHomeStore";
import { useOrientation } from "~/hooks/use-orientation";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  GestureHandlerRootView,
  PanGestureHandler,
} from "react-native-gesture-handler";
import { Card } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "~/components/ui/alert";
import { z } from "zod";

// URL 验证 Schema
const urlSchema = z.string().url().startsWith("http");

// 超时配置
const LOAD_TIMEOUT = 15000;
const MAX_RETRIES = 3;

interface DeviceConfig {
  name: string;
  width: number;
  height: number;
  userAgent?: string;
  icon: typeof Smartphone | typeof Monitor;
  description?: string;
}

const DEFAULT_DEVICES: Record<string, DeviceConfig> = {
  responsive: {
    name: "自适应",
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height,
    icon: Monitor,
    description: "跟随窗口大小自动调整",
  },
  iphone12: {
    name: "iPhone 12",
    width: 390,
    height: 844,
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)",
    icon: Smartphone,
    description: "390 × 844",
  },
  ipad: {
    name: "iPad",
    width: 810,
    height: 1080,
    userAgent: "Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)",
    icon: Smartphone,
    description: "810 × 1080",
  },
} as const;

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
  timeout?: number;
  maxRetries?: number;
  onTimeout?: () => void;
  gesturesEnabled?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedCard = Animated.createAnimatedComponent(Card);

const ForwardedWebView = forwardRef<WebView, WebViewProps>((props, ref) => {
  return (
    <View style={props.style} className={props.className}>
      <WebView {...props} ref={ref} />
    </View>
  );
});

ForwardedWebView.displayName = "ForwardedWebView";

const AnimatedWebView = Animated.createAnimatedComponent(View);

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
  timeout = LOAD_TIMEOUT,
  maxRetries = MAX_RETRIES,
  onTimeout,
  gesturesEnabled = true,
}) => {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [key, setKey] = useState(0);
  const [recentDevices, setRecentDevices] = useState<string[]>([]);
  const [retryCount, setRetryCount] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const webViewRef = useRef<WebView>(null);

  const { isFullscreen, currentDevice, setFullscreen, setCurrentDevice } =
    useHomeStore();
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
    toast.success("加载成功", {
      description: `${devices[currentDevice].name} 模式下预览`,
    });
  }, [onLoadEnd, devices, currentDevice]);

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

  // URL 验证
  useEffect(() => {
    try {
      urlSchema.parse(url);
    } catch (error) {
      setError(new Error("无效的 URL 地址"));
      toast.error("URL 格式错误");
    }
  }, [url]);

  // 超时处理
  useEffect(() => {
    if (loading) {
      timeoutRef.current = setTimeout(() => {
        if (retryCount < maxRetries) {
          setRetryCount((prev) => prev + 1);
          handleReload();
          toast.error(`加载超时，第 ${retryCount + 1} 次重试`);
        } else {
          setError(new Error("加载超时"));
          onTimeout?.();
        }
      }, timeout);
    }
    return () => timeoutRef.current && clearTimeout(timeoutRef.current);
  }, [loading, timeout, retryCount]);

  // Animation shared values
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const translateY = useSharedValue(0);
  const deviceButtonScale = useSharedValue(1);
  const reloadScale = useSharedValue(1);

  // Spring configurations
  const springConfig = {
    damping: 15,
    stiffness: 120,
    mass: 0.6,
  };

  const timingConfig = {
    duration: 300,
    easing: Easing.bezier(0.4, 0, 0.2, 1),
  };

  // Animated styles
  const webViewStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const deviceButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: deviceButtonScale.value }],
  }));

  const reloadButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: reloadScale.value }],
  }));

  // 手势控制
  const handleGesture = useAnimatedGestureHandler({
    onStart: (_, ctx: any) => {
      ctx.startY = translateY.value;
    },
    onActive: (event, ctx) => {
      if (gesturesEnabled) {
        translateY.value = ctx.startY + event.translationY;
      }
    },
    onEnd: (event) => {
      if (Math.abs(event.velocityY) > 500) {
        toggleFullscreen();
      } else {
        translateY.value = withSpring(0);
      }
    },
  });

  // Handle device change with animation
  const handleDeviceChange = useCallback(
    async (deviceKey: string) => {
      try {
        deviceButtonScale.value = withSpring(0.95, springConfig);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        scale.value = withSpring(0.95, springConfig);
        opacity.value = withTiming(0.5, timingConfig);

        setCurrentDevice(deviceKey);
        setKey((prev) => prev + 1);

        // 更新最近使用的设备列表
        setRecentDevices((prev) => {
          const filtered = prev.filter((d) => d !== deviceKey);
          return [deviceKey, ...filtered].slice(0, 3);
        });

        scale.value = withSpring(1, springConfig);
        opacity.value = withTiming(1, timingConfig);
        deviceButtonScale.value = withSpring(1, springConfig);

        toast.success("设备切换成功", {
          description: `当前: ${devices[deviceKey].name}`,
        });
      } catch (error) {
        console.error("切换设备失败:", error);
        toast.error("切换设备失败");
      }
    },
    [setCurrentDevice, devices]
  );

  // Toggle fullscreen with animation
  const toggleFullscreen = useCallback(async () => {
    try {
      await Haptics.impactAsync();
      translateY.value = withSpring(isFullscreen ? 0 : -20, springConfig);
      scale.value = withSpring(isFullscreen ? 1 : 0.98, springConfig);

      setTimeout(() => {
        setFullscreen(!isFullscreen);
        scale.value = withSpring(1, springConfig);
        translateY.value = withSpring(0, springConfig);
      }, 200);

      toast.success(isFullscreen ? "退出全屏" : "进入全屏");
    } catch (error) {
      console.error("切换全屏失败:", error);
      toast.error("切换全屏失败");
    }
  }, [isFullscreen, setFullscreen]);

  const handleReloadPress = useCallback(async () => {
    try {
      reloadScale.value = withSequence(
        withSpring(0.9, springConfig),
        withSpring(1, springConfig)
      );
      await Haptics.impactAsync();
      handleReload();
      toast.success("刷新成功");
    } catch (error) {
      console.error("刷新失败:", error);
      toast.error("刷新失败");
    }
  }, [handleReload]);

  const deviceConfig = devices[currentDevice];

  return (
    <PanGestureHandler onGestureEvent={handleGesture} enabled={gesturesEnabled}>
      <GestureHandlerRootView className="flex-1">
        <View
          className="flex-1 bg-background native:bg-gray-50 dark:native:bg-gray-900"
          style={{
            paddingTop: !isFullscreen ? insets.top : 0,
            paddingBottom: !isFullscreen ? insets.bottom : 0,
          }}
        >
          {/* Device Selection Bar */}
          {!isFullscreen && (
            <Animated.View
              entering={SlideInUp.springify()}
              exiting={SlideOutDown.springify()}
              className="px-4 py-3 border-b border-border/30 bg-card/80 backdrop-blur-lg"
            >
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-base font-medium text-foreground">
                  设备预览
                </Text>
                <Button
                  variant="ghost"
                  size="icon"
                  onPress={toggleFullscreen}
                  className="h-8 w-8"
                >
                  <XCircle className="h-5 w-5 text-muted-foreground" />
                </Button>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="native:-mx-2"
              >
                <View className="flex-row space-x-2 px-2">
                  {recentDevices.length > 0 && (
                    <View className="flex-row space-x-2 pr-2 border-r border-border/30">
                      {recentDevices.map((deviceKey) => {
                        const device = devices[deviceKey];
                        return (
                          <AnimatedPressable
                            key={`recent-${deviceKey}`}
                            style={deviceButtonStyle}
                            onPress={() => handleDeviceChange(deviceKey)}
                            className="native:active:opacity-70"
                          >
                            <View
                              className={`
                                px-4 py-2.5 rounded-xl flex-row items-center space-x-2
                                ${
                                  currentDevice === deviceKey
                                    ? "bg-primary/90 hover:bg-primary"
                                    : "bg-muted/80 border border-border/50"
                                }
                              `}
                            >
                              <device.icon
                                className={`h-4 w-4 native:h-5 native:w-5 ${
                                  currentDevice === deviceKey
                                    ? "text-primary-foreground"
                                    : "text-muted-foreground"
                                }`}
                              />
                              <Text
                                className={`
                                  text-sm native:text-base font-medium
                                  ${
                                    currentDevice === deviceKey
                                      ? "text-primary-foreground"
                                      : "text-muted-foreground"
                                  }
                                `}
                              >
                                {device.name}
                              </Text>
                              {device.description && (
                                <Text
                                  className={`
                                    text-xs native:text-sm
                                    ${
                                      currentDevice === deviceKey
                                        ? "text-primary-foreground/70"
                                        : "text-muted-foreground/70"
                                    }
                                  `}
                                >
                                  {device.description}
                                </Text>
                              )}
                            </View>
                          </AnimatedPressable>
                        );
                      })}
                    </View>
                  )}

                  {Object.entries(devices).map(([key, device]) => (
                    <AnimatedPressable
                      key={key}
                      style={deviceButtonStyle}
                      onPress={() => handleDeviceChange(key)}
                      className="native:active:opacity-70"
                    >
                      <View
                        className={`
                          px-4 py-2.5 rounded-xl flex-row items-center space-x-2
                          ${
                            currentDevice === key
                              ? "bg-primary/90 hover:bg-primary"
                              : "bg-muted/80 border border-border/50"
                          }
                        `}
                      >
                        <device.icon
                          className={`h-4 w-4 native:h-5 native:w-5 ${
                            currentDevice === key
                              ? "text-primary-foreground"
                              : "text-muted-foreground"
                          }`}
                        />
                        <Text
                          className={`
                            text-sm native:text-base font-medium
                            ${
                              currentDevice === key
                                ? "text-primary-foreground"
                                : "text-muted-foreground"
                            }
                          `}
                        >
                          {device.name}
                        </Text>
                        {device.description && (
                          <Text
                            className={`
                              text-xs native:text-sm
                              ${
                                currentDevice === key
                                  ? "text-primary-foreground/70"
                                  : "text-muted-foreground/70"
                              }
                            `}
                          >
                            {device.description}
                          </Text>
                        )}
                      </View>
                    </AnimatedPressable>
                  ))}
                </View>
              </ScrollView>
            </Animated.View>
          )}

          {/* WebView Container */}
          <View className="flex-1 relative native:px-4 native:py-2">
            <AnimatedWebView
              style={[
                webViewStyle,
                {
                  width: isFullscreen
                    ? Dimensions.get("window").width
                    : deviceConfig.width,
                  height: isFullscreen
                    ? Dimensions.get("window").height
                    : deviceConfig.height,
                },
                !isFullscreen && styles.webviewShadow,
              ]}
              className="flex-1 overflow-hidden rounded-2xl native:rounded-3xl"
            >
              <ForwardedWebView
                key={key}
                source={{ uri: getUrlWithParams(url) }}
                style={{ flex: 1 }}
                onLoadStart={handleLoadStart}
                onLoad={handleLoadEnd}
                onError={handleError}
                javaScriptEnabled={javaScriptEnabled}
                domStorageEnabled={domStorageEnabled}
                scalesPageToFit={scalesPageToFit}
                startInLoadingState={startInLoadingState}
                userAgent={deviceConfig.userAgent}
              />
            </AnimatedWebView>

            {/* Loading State */}
            {loading && (
              <Animated.View
                entering={FadeIn.duration(200)}
                exiting={FadeOut.duration(150)}
                className="absolute inset-0 justify-center items-center bg-background/90 backdrop-blur-lg rounded-2xl"
              >
                <RefreshCw
                  className="animate-spin text-primary native:h-8 native:w-8"
                  size={32}
                />
                <Text className="mt-4 text-base native:text-lg font-medium text-foreground">
                  加载中...
                </Text>
              </Animated.View>
            )}

            {/* Error State */}
            {error ? (
              <Animated.View
                entering={FadeIn.springify()}
                className="absolute inset-0 p-6 native:p-8 bg-background/90 backdrop-blur-lg rounded-2xl"
              >
                <Alert
                  variant="destructive"
                  icon={AlertCircle}
                  className="rounded-2xl border-2 border-destructive/30"
                >
                  <AlertTitle className="text-lg native:text-xl font-medium text-destructive">
                    加载失败
                  </AlertTitle>
                  <AlertDescription className="text-base text-destructive/90">
                    {error.message || "未知错误"}
                  </AlertDescription>
                </Alert>

                <View className="flex-row space-x-3 mt-6">
                  <Button
                    variant="default"
                    size="lg"
                    onPress={handleReloadPress}
                    className="flex-1 rounded-xl px-6 native:h-14"
                  >
                    <RefreshCw className="mr-2 h-5 w-5 native:h-6 native:w-6" />
                    <Text className="text-base native:text-lg font-medium text-primary-foreground">
                      重试
                    </Text>
                  </Button>

                  <Button
                    variant="outline"
                    size="lg"
                    onPress={() => window.open(url, "_blank")}
                    className="rounded-xl px-6 native:h-14"
                  >
                    <ExternalLink className="h-5 w-5 native:h-6 native:w-6" />
                  </Button>
                </View>
              </Animated.View>
            ) : null}

            {/* Action Buttons */}
            <View
              className={`
                absolute right-4 space-y-3
                ${isFullscreen ? "top-4" : "bottom-4"}
              `}
            >
              <AnimatedPressable
                style={reloadButtonStyle}
                onPress={handleReloadPress}
              >
                <Button
                  variant="outline"
                  size="icon"
                  className="h-12 w-12 rounded-xl bg-background/80 backdrop-blur-lg shadow-lg"
                >
                  <RefreshCw className="h-5 w-5 native:h-6 native:w-6" />
                </Button>
              </AnimatedPressable>

              <Button
                variant={isFullscreen ? "outline" : "default"}
                size="icon"
                className="h-12 w-12 rounded-xl shadow-lg"
                onPress={toggleFullscreen}
              >
                {isFullscreen ? (
                  <Minimize2 className="h-5 w-5 native:h-6 native:w-6" />
                ) : (
                  <Maximize2 className="h-5 w-5 native:h-6 native:w-6" />
                )}
              </Button>
            </View>

            {/* Device Info Card */}
            {!isFullscreen && !error && !loading && (
              <AnimatedCard
                entering={SlideInUp.delay(200).springify()}
                className="absolute left-4 bottom-20 right-20 bg-background/80 backdrop-blur-lg border-border/30"
              >
                <View className="p-4 space-y-2">
                  <Text className="text-sm font-medium text-foreground">
                    当前设备: {deviceConfig.name}
                  </Text>
                  {deviceConfig.description && (
                    <Text className="text-xs text-muted-foreground">
                      分辨率: {deviceConfig.description}
                    </Text>
                  )}
                  {deviceConfig.userAgent && (
                    <Text
                      className="text-xs text-muted-foreground"
                      numberOfLines={1}
                    >
                      User Agent: {deviceConfig.userAgent}
                    </Text>
                  )}
                </View>
              </AnimatedCard>
            )}
          </View>
        </View>
      </GestureHandlerRootView>
    </PanGestureHandler>
  );
};

const styles = StyleSheet.create({
  webviewShadow: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
});
