import React from "react";
import { View, ViewStyle } from "react-native"; // Import ViewStyle
import Animated, {
  FadeIn,
  SlideInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  LinearTransition,
  AnimatedStyleProp, // Import AnimatedStyleProp
} from "react-native-reanimated";
import { Card, CardHeader, CardContent } from "~/components/ui/card";

const AnimatedCard = Animated.createAnimatedComponent(Card);

// 增强型骨架块组件
type SkeletonBlockProps = {
  width?: string | number;
  height?: string | number;
  delay?: number;
  duration?: number;
  className?: string;
};

const SkeletonBlock: React.FC<SkeletonBlockProps> = ({
  width = "100%",
  height = 12,
  delay = 0,
  duration = 2000,
  className = "",
}) => {
  const opacity = useSharedValue(0.5);

  // 创建呼吸效果
  React.useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.8, {
          duration: duration / 2,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        }),
        withTiming(0.5, {
          duration: duration / 2,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        })
      ),
      -1, // 无限重复
      true // 反向动画
    );
  }, [duration]);

  // Explicitly type the return of the updater function to ViewStyle
  const animatedStyle = useAnimatedStyle((): ViewStyle => {
    return {
      opacity: opacity.value,
      // Cast width and height to any to work around the type error
      // React Native accepts these values even though the types are stricter
      width: width as any,
      height: height as any,
    };
  });

  return (
    <Animated.View
      entering={FadeIn.delay(delay).duration(600).springify()}
      // Explicitly cast the style prop to the expected animated style type
      style={animatedStyle as AnimatedStyleProp<ViewStyle>}
      layout={LinearTransition.springify()}
      className={`bg-gradient-to-r from-muted/70 to-muted/30 rounded-lg ${className}`}
    />
  );
};

const SettingsSkeleton = () => {
  return (
    <View className="space-y-4 native:space-y-6 p-4">
      {/* 标题与副标题组合骨架 */}
      <View className="space-y-2 mb-6">
        <SkeletonBlock
          height={8}
          width="35%"
          delay={100}
          className="mb-2 native:h-10"
        />
        <SkeletonBlock
          height={6}
          width="60%"
          delay={200}
          className="native:h-6"
        />
      </View>

      {/* 常用设置卡片骨架 */}
      <AnimatedCard
        entering={SlideInUp.delay(150).duration(600).springify()}
        className="native:rounded-2xl overflow-hidden mb-4"
      >
        <CardHeader className="native:py-4 border-b border-border/10">
          <View className="flex-row items-center space-x-3">
            <SkeletonBlock
              height={24}
              width={24}
              className="rounded-full native:h-8 native:w-8"
            />
            <SkeletonBlock height={6} width="30%" className="native:h-8" />
          </View>
        </CardHeader>
        <CardContent className="space-y-3 native:space-y-4 py-3 native:py-5">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center space-x-3 flex-1">
              <SkeletonBlock
                height={32}
                width={32}
                className="rounded-full native:h-10 native:w-10"
              />
              <View className="space-y-2 flex-1">
                <SkeletonBlock height={6} width="60%" className="native:h-7" />
                <SkeletonBlock height={4} width="40%" className="native:h-5" />
              </View>
            </View>
            <SkeletonBlock
              height={20}
              width={40}
              className="rounded-full native:h-8 native:w-12"
            />
          </View>

          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center space-x-3 flex-1">
              <SkeletonBlock
                height={32}
                width={32}
                className="rounded-full native:h-10 native:w-10"
              />
              <View className="space-y-2 flex-1">
                <SkeletonBlock height={6} width="40%" className="native:h-7" />
                <SkeletonBlock height={4} width="70%" className="native:h-5" />
              </View>
            </View>
            <SkeletonBlock
              height={20}
              width={40}
              className="rounded-full native:h-8 native:w-12"
            />
          </View>

          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center space-x-3 flex-1">
              <SkeletonBlock
                height={32}
                width={32}
                className="rounded-full native:h-10 native:w-10"
              />
              <View className="space-y-2 flex-1">
                <SkeletonBlock height={6} width="50%" className="native:h-7" />
                <SkeletonBlock height={4} width="60%" className="native:h-5" />
              </View>
            </View>
            <SkeletonBlock
              height={20}
              width={40}
              className="rounded-full native:h-8 native:w-12"
            />
          </View>
        </CardContent>
      </AnimatedCard>

      {/* 外观设置卡片骨架 */}
      <AnimatedCard
        entering={SlideInUp.delay(300).duration(600).springify()}
        className="native:rounded-2xl overflow-hidden mb-4"
      >
        <CardHeader className="native:py-4 border-b border-border/10">
          <View className="flex-row items-center space-x-3">
            <SkeletonBlock
              height={24}
              width={24}
              className="rounded-full native:h-8 native:w-8"
            />
            <SkeletonBlock height={6} width="25%" className="native:h-8" />
          </View>
        </CardHeader>
        <CardContent className="space-y-4 native:space-y-5 py-3 native:py-5">
          <View className="flex-row space-x-2 native:space-x-3">
            <SkeletonBlock
              height={40}
              width="32%"
              className="rounded-xl native:h-12"
            />
            <SkeletonBlock
              height={40}
              width="32%"
              className="rounded-xl native:h-12"
            />
            <SkeletonBlock
              height={40}
              width="32%"
              className="rounded-xl native:h-12"
            />
          </View>

          <SkeletonBlock height={120} className="rounded-xl native:h-160" />
        </CardContent>
      </AnimatedCard>

      {/* 隐私与安全卡片骨架 */}
      <AnimatedCard
        entering={SlideInUp.delay(450).duration(600).springify()}
        className="native:rounded-2xl overflow-hidden mb-4"
      >
        <CardHeader className="native:py-4 border-b border-border/10">
          <View className="flex-row items-center space-x-3">
            <SkeletonBlock
              height={24}
              width={24}
              className="rounded-full native:h-8 native:w-8"
            />
            <SkeletonBlock height={6} width="40%" className="native:h-8" />
          </View>
        </CardHeader>
        <CardContent className="native:py-5 py-3">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center space-x-3 flex-1">
              <SkeletonBlock
                height={32}
                width={32}
                className="rounded-full native:h-10 native:w-10"
              />
              <SkeletonBlock height={6} width="50%" className="native:h-7" />
            </View>
            <SkeletonBlock
              height={20}
              width={40}
              className="rounded-full native:h-8 native:w-12"
            />
          </View>

          <SkeletonBlock height={60} className="rounded-xl native:h-80 mb-4" />

          <View className="flex-row space-x-3">
            <SkeletonBlock
              height={44}
              width="48%"
              className="rounded-xl native:h-12"
            />
            <SkeletonBlock
              height={44}
              width="48%"
              className="rounded-xl native:h-12"
            />
          </View>
        </CardContent>
      </AnimatedCard>

      {/* 底部操作区骨架 */}
      <AnimatedCard
        entering={SlideInUp.delay(600).duration(600).springify()}
        className="native:rounded-2xl overflow-hidden"
      >
        <CardContent className="p-4 native:p-5">
          <View className="flex-row justify-between items-center">
            <SkeletonBlock height={6} width="40%" className="native:h-7" />
            <SkeletonBlock
              height={36}
              width={100}
              className="rounded-xl native:h-10 native:w-32"
            />
          </View>
        </CardContent>
      </AnimatedCard>
    </View>
  );
};

export default SettingsSkeleton;
