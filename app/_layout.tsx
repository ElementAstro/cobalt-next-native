import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as ScreenOrientation from "expo-screen-orientation";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import "react-native-reanimated";
import { Text } from "react-native";
import { PortalHost } from "@rn-primitives/portal";

import "../global.css";

import { useColorScheme } from "@/hooks/useColorScheme";
import { Toaster } from "sonner-native";
import ErrorBoundary from "@/components/error/ErrorBoundary";

// 防止资源加载完成前自动隐藏启动屏幕
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  // 处理屏幕方向和资源加载
  useEffect(() => {
    async function prepare() {
      try {
        // 锁定屏幕方向
        await ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.LANDSCAPE_LEFT
        );

        // 如果字体已加载，隐藏启动屏幕
        if (loaded) {
          await SplashScreen.hideAsync();
        }
      } catch (e) {
        console.warn(e);
      }
    }

    prepare();

    return () => {
      // 清理效果：解锁屏幕方向
      ScreenOrientation.unlockAsync();
    };
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <ErrorBoundary>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
        </Stack>
        <PortalHost />
        <StatusBar style="auto" />
        <Toaster
          position="top-center"
          // offset={100}
          duration={3000}
          swipeToDismissDirection="up"
          visibleToasts={4}
          closeButton
          autoWiggleOnUpdate="toast-change"
          theme="system"
          icons={{
            error: <Text>💥</Text>,
            loading: <Text>🔄</Text>,
          }}
          toastOptions={{
            actionButtonStyle: {
              paddingHorizontal: 20,
            },
          }}
          pauseWhenPageIsHidden
        />
      </ThemeProvider>
    </ErrorBoundary>
  );
}
