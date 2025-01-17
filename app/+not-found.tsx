import { Link, Stack } from "expo-router";
import { View, Text } from "react-native";
import {
  HeartCrack,
  QrCode,
  Home as HomeIcon,
  Scan as ScanIcon,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withDelay,
  useSharedValue,
  Easing,
} from "react-native-reanimated";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { H2, Large, Small } from "@/components/ui/typography";
import { Button } from "@/components/ui/button";
import { ThemedView } from "@/components/ThemedView";
import { useEffect } from "react";

const AnimatedHeartCrack = Animated.createAnimatedComponent(HeartCrack);
const AnimatedView = Animated.createAnimatedComponent(View);
const AnimatedText = Animated.createAnimatedComponent(Text);

export default function NotFoundScreen() {
  const errorCode = ":( 404";
  const errorDetails = [
    "• 页面未能找到",
    "• 请检查URL是否正确",
    "• 您可以返回首页重试",
  ];

  const rotation = useSharedValue(0);
  const cardScale = useSharedValue(0.9);
  const cardOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const detailsTranslateX = useSharedValue(-50);

  useEffect(() => {
    cardScale.value = withSpring(1);
    cardOpacity.value = withTiming(1, { duration: 1000 });
    rotation.value = withRepeat(
      withTiming(360, { duration: 2000, easing: Easing.linear }),
      -1
    );
    textOpacity.value = withDelay(300, withTiming(1));
    detailsTranslateX.value = withDelay(500, withSpring(0));
  }, [cardOpacity, cardScale, detailsTranslateX, rotation, textOpacity]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ scale: cardScale.value }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  const detailsStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: detailsTranslateX.value }],
    opacity: withTiming(detailsTranslateX.value === 0 ? 1 : 0),
  }));

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient colors={["#1d4ed8", "#1e40af"]} className="flex-1">
        <ThemedView className="flex-1 relative">
          <View className="absolute inset-0 opacity-5 flex-row flex-wrap justify-center items-center">
            {[...Array(20)].map((_, i) => (
              <QrCode key={i} size={100} className="m-4 text-white" />
            ))}
          </View>

          <View className="flex-1 justify-center px-6">
            <Animated.View style={cardStyle}>
              <Card className="bg-white/20 backdrop-blur-lg border-white/20 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex-row items-center space-x-2">
                    <AnimatedHeartCrack
                      size={32}
                      className="text-white"
                      style={iconStyle}
                    />
                    <AnimatedText className="text-white font-mono">
                      {errorCode}
                    </AnimatedText>
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
                  <AnimatedView style={textStyle}>
                    <Large className="text-white font-mono">
                      页面遇到问题，需要重新启动。
                    </Large>
                  </AnimatedView>

                  <AnimatedView style={detailsStyle}>
                    {errorDetails.map((detail, index) => (
                      <Small
                        key={index}
                        className="text-white/90 font-mono mb-2"
                      >
                        {detail}
                      </Small>
                    ))}
                  </AnimatedView>
                </CardContent>

                <CardFooter className="flex-row space-x-4">
                  <Link href="/" asChild>
                    <Button
                      variant="secondary"
                      className="flex-1 bg-white/10 backdrop-blur-lg transform scale-95"
                    >
                      <HomeIcon size={16} className="mr-2 text-white" />
                      返回首页
                    </Button>
                  </Link>
                  <Link href="/scanner" asChild>
                    <Button
                      variant="secondary"
                      className="flex-1 bg-white/10 backdrop-blur-lg transform scale-95"
                    >
                      <ScanIcon size={16} className="mr-2 text-white" />
                      去扫描
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            </Animated.View>

            <Animated.View style={textStyle}>
              <Small className="text-white/70 text-center mt-8 font-mono">
                错误代码: PAGE_NOT_FOUND_EXCEPTION
              </Small>
            </Animated.View>
          </View>
        </ThemedView>
      </LinearGradient>
    </>
  );
}
