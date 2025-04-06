import React from "react";
import { View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Card, CardHeader, CardContent } from "~/components/ui/card";

const AnimatedCard = Animated.createAnimatedComponent(Card);

const SkeletonBlock = ({ delay = 0 }) => (
  <Animated.View
    entering={FadeIn.delay(delay).duration(600)}
    className="bg-muted/50 rounded-lg h-12 native:h-14"
  />
);

const SettingsSkeleton = () => {
  return (
    <View className="space-y-4 native:space-y-6 p-4">
      {/* 标题骨架 */}
      <Animated.View
        entering={FadeIn.duration(600)}
        className="bg-muted/50 h-8 w-32 rounded-lg mb-4"
      />

      {/* 常用设置卡片骨架 */}
      <AnimatedCard className="native:rounded-2xl overflow-hidden">
        <CardHeader className="native:py-4">
          <View className="bg-muted/50 h-6 w-24 rounded-lg" />
        </CardHeader>
        <CardContent className="space-y-2 native:space-y-3">
          <SkeletonBlock delay={100} />
          <SkeletonBlock delay={200} />
          <SkeletonBlock delay={300} />
          <SkeletonBlock delay={400} />
        </CardContent>
      </AnimatedCard>

      {/* 外观设置卡片骨架 */}
      <AnimatedCard className="native:rounded-2xl overflow-hidden">
        <CardHeader className="native:py-4">
          <View className="bg-muted/50 h-6 w-24 rounded-lg" />
        </CardHeader>
        <CardContent className="space-y-2 native:space-y-3">
          <SkeletonBlock delay={500} />
        </CardContent>
      </AnimatedCard>

      {/* 隐私与安全卡片骨架 */}
      <AnimatedCard className="native:rounded-2xl overflow-hidden">
        <CardHeader className="native:py-4">
          <View className="bg-muted/50 h-6 w-24 rounded-lg" />
        </CardHeader>
        <CardContent className="space-y-2 native:space-y-3">
          <SkeletonBlock delay={600} />
        </CardContent>
      </AnimatedCard>

      {/* 帮助与支持卡片骨架 */}
      <AnimatedCard className="native:rounded-2xl overflow-hidden">
        <CardHeader className="native:py-4">
          <View className="bg-muted/50 h-6 w-24 rounded-lg" />
        </CardHeader>
        <CardContent>
          <View className="bg-muted/50 h-4 w-20 rounded-lg" />
        </CardContent>
      </AnimatedCard>
    </View>
  );
};

export default SettingsSkeleton;