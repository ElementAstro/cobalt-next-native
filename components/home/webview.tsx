import React, {
  useState,
  useCallback,
  forwardRef,
  useEffect,
  useRef,
  useMemo,
  memo,
  Suspense,
} from "react";
import {
  View,
  Dimensions,
  StyleSheet,
  Pressable,
  ScrollView,
  AccessibilityInfo,
  findNodeHandle,
} from "react-native";
import { WebView } from "react-native-webview";
import { WebViewProps } from "react-native-webview";
import { WebViewErrorBoundary } from "./webview-error-boundary";
import { WebViewSkeleton } from "./webview-skeleton";
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
  LucideIcon,
} from "lucide-react-native";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import { Badge } from "~/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "~/components/ui/alert";
import { toast } from "sonner-native";
import { useHomeStore } from "~/stores/useHomeStore";
import { useOrientation } from "~/hooks/use-orientation";
import * as Haptics from "expo-haptics";
import { z } from "zod";
import { WebViewErrorEvent } from "react-native-webview/lib/WebViewTypes";

// URL 验证模式
const urlSchema = z.string().url().startsWith("http");

// 超时配置
const LOAD_TIMEOUT = 15000;
const MAX_RETRIES = 3;

// 设备类型定义
type DeviceType = "responsive" | "mobile";

interface DeviceConfig {
  name: string;
  icon: LucideIcon;
  userAgent: string;
  width?: number;
  height?: number;
  description?: string;
}

interface DevicesConfig {
  [key: string]: DeviceConfig;
}

// 设备配置
const DEFAULT_DEVICES: DevicesConfig = {
  responsive: {
    name: "自适应",
    icon: Monitor,
    userAgent: "Mozilla/5.0",
  },
  mobile: {
    name: "移动设备",
    icon: Smartphone,
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)",
    width: 375,
    height: 667,
    description: "iPhone 8",
  },
  // ... 其他设备配置
};

// 扩展WebViewProps类型
interface CustomWebViewProps extends WebViewProps {
  url: string;
  currentDevice?: DeviceType;
  isFullscreen?: boolean;
  onLoadEnd?: () => void;
  onError?: (event: WebViewErrorEvent) => void;
  onToggleFullscreen?: () => void;
}

// 创建AnimatedCard组件
const AnimatedCard = Animated.createAnimatedComponent(View);

export const WebViewComponent = forwardRef<WebView, CustomWebViewProps>(
  (
    {
      url,
      currentDevice = "responsive",
      isFullscreen = false,
      onLoadEnd,
      onError,
      onToggleFullscreen,
    },
    forwardedRef
  ) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [retryCount, setRetryCount] = useState(0);
    const timeoutRef = useRef<NodeJS.Timeout>();
    const webViewRef = useRef<WebView>(null);
    const [key, setKey] = useState(0);
    const orientation = useOrientation();

    // 性能优化：缓存设备配置
    const memoizedDevices = useMemo(() => DEFAULT_DEVICES, []);

    // 动画值
    const reloadScale = useSharedValue(1);
    const fullscreenScale = useSharedValue(1);
    const deviceListHeight = useSharedValue(0);

    // 动画样式
    const reloadButtonStyle = useAnimatedStyle(() => ({
      transform: [{ scale: reloadScale.value }],
    }));

    const fullscreenButtonStyle = useAnimatedStyle(() => ({
      transform: [{ scale: fullscreenScale.value }],
    }));

    const deviceListStyle = useAnimatedStyle(() => ({
      height: deviceListHeight.value,
      opacity: interpolate(
        deviceListHeight.value,
        [0, 150],
        [0, 1],
        Extrapolate.CLAMP
      ),
    }));

    // 设备切换处理
    const handleDeviceChange = useCallback(
      (device: DeviceType) => {
        if (device === currentDevice) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setKey((prev) => prev + 1);
        deviceListHeight.value = withTiming(0);

        toast.success("设备已切换", {
          description: `切换至 ${memoizedDevices[device].name} 模式`,
        });
      },
      [currentDevice, memoizedDevices, deviceListHeight]
    );

    // 加载完成处理
    const handleLoadEnd = useCallback(() => {
      clearTimeout(timeoutRef.current);
      setLoading(false);
      onLoadEnd?.();

      toast.success("加载成功", {
        description: `${memoizedDevices[currentDevice].name} 模式下预览`,
      });
    }, [onLoadEnd, memoizedDevices, currentDevice]);

    // 错误处理
    const handleError = useCallback(
      (err: any) => {
        setError(err);
        setLoading(false);
        onError?.(err);

        if (retryCount < MAX_RETRIES) {
          toast.error("加载失败，正在重试", {
            description: err.message,
          });
          setRetryCount((prev) => prev + 1);
          setKey((prev) => prev + 1);
        } else {
          toast.error("加载失败", {
            description: err.message,
          });
        }
      },
      [onError, retryCount]
    );

    // 重新加载
    const handleReload = useCallback(() => {
      setError(null);
      setLoading(true);
      setRetryCount(0);
      setKey((prev) => prev + 1);

      reloadScale.value = withSequence(withSpring(0.9), withSpring(1));

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }, [reloadScale]);

    // 切换全屏
    const handleToggleFullscreen = useCallback(() => {
      fullscreenScale.value = withSequence(withSpring(0.9), withSpring(1));

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onToggleFullscreen?.();
    }, [onToggleFullscreen, fullscreenScale]);

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
          if (loading) {
            handleError(new Error("加载超时"));
          }
        }, LOAD_TIMEOUT);
      }
      return () => clearTimeout(timeoutRef.current);
    }, [loading, handleError]);

    // 清理重试计数
    useEffect(() => {
      setRetryCount(0);
    }, [url]);

    if (!url) {
      return <WebViewSkeleton />;
    }

    const currentDeviceConfig = memoizedDevices[currentDevice];

    return (
      <WebViewErrorBoundary>
        <Suspense fallback={<WebViewSkeleton />}>
          <View className="flex-1 relative">
            <WebView
              key={key}
              ref={forwardedRef}
              source={{ uri: url }}
              onLoadEnd={handleLoadEnd}
              onError={handleError}
              userAgent={currentDeviceConfig.userAgent}
              style={{
                width: currentDeviceConfig.width,
                height: currentDeviceConfig.height,
                alignSelf: "center",
              }}
              className="flex-1 bg-background rounded-2xl overflow-hidden"
              contentInset={{ top: 0, left: 0, bottom: 0, right: 0 }}
              decelerationRate="normal"
              scrollEnabled={true}
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
              cacheEnabled={true}
              cacheMode="LOAD_CACHE_ELSE_NETWORK"
              allowsInlineMediaPlayback={true}
              mediaPlaybackRequiresUserAction={false}
              allowsFullscreenVideo={true}
              allowsBackForwardNavigationGestures={true}
              pullToRefreshEnabled={true}
              onContentProcessDidTerminate={handleReload}
              accessible={true}
              accessibilityLabel={`网页内容：${url}`}
            />

            {/* 错误状态 */}
            {error && (
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
                    onPress={handleReload}
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
            )}

            {/* 加载状态 */}
            {loading && !error && <WebViewSkeleton />}

            {/* 操作按钮 */}
            <View
              className={`
              absolute right-4 space-y-3
              ${isFullscreen ? "top-4" : "bottom-4"}
            `}
            >
              <Animated.View style={reloadButtonStyle}>
                <Button
                  variant="outline"
                  size="icon"
                  onPress={handleReload}
                  className="h-12 w-12 rounded-xl bg-background/80 backdrop-blur-lg shadow-lg"
                >
                  <RefreshCw className="h-5 w-5 native:h-6 native:w-6" />
                </Button>
              </Animated.View>

              <Animated.View style={fullscreenButtonStyle}>
                <Button
                  variant={isFullscreen ? "outline" : "default"}
                  size="icon"
                  className="h-12 w-12 rounded-xl shadow-lg"
                  onPress={handleToggleFullscreen}
                >
                  {isFullscreen ? (
                    <Minimize2 className="h-5 w-5 native:h-6 native:w-6" />
                  ) : (
                    <Maximize2 className="h-5 w-5 native:h-6 native:w-6" />
                  )}
                </Button>
              </Animated.View>
            </View>

            {/* 设备信息卡片 */}
            {!isFullscreen && !error && !loading && (
              <AnimatedCard
                entering={SlideInUp.delay(200).springify()}
                className="absolute left-4 bottom-20 right-20 bg-background/80 backdrop-blur-lg border-border/30"
              >
                <View className="p-4 space-y-2">
                  <Text className="text-sm font-medium text-foreground">
                    当前设备: {currentDeviceConfig.name}
                  </Text>
                  {currentDeviceConfig.description && (
                    <Text className="text-xs text-muted-foreground">
                      {currentDeviceConfig.description}
                    </Text>
                  )}
                </View>
              </AnimatedCard>
            )}
          </View>
        </Suspense>
      </WebViewErrorBoundary>
    );
  }
);

WebViewComponent.displayName = "WebViewComponent";

export default memo(WebViewComponent);
