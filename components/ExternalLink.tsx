import React from "react";
import { ExternalPathString, Link } from "expo-router";
import { openBrowserAsync } from "expo-web-browser";
import { type ComponentProps } from "react";
import { Platform, TouchableOpacity } from "react-native";
import { ExternalLink as ExternalIcon } from "lucide-react-native";
import Animated, { FadeIn, FadeOut, ZoomIn } from "react-native-reanimated";
import { cn } from "@/lib/utils";

type Props = Omit<ComponentProps<typeof Link>, "href"> & {
  href: `http${string}` | `https${string}`;
};

export function ExternalLink({ href, children, ...rest }: Props) {
  const handlePress = async (event: any) => {
    if (Platform.OS !== "web") {
      // 阻止默认行为
      event.preventDefault();
      // 在应用内打开链接
      await openBrowserAsync(href);
    }
  };

  return (
    <Animated.View entering={FadeIn} exiting={FadeOut}>
      <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
        <Link
          target="_blank"
          href={href as ExternalPathString}
          {...rest}
          className={cn(
            "flex-row items-center text-blue-500",
            "hover:underline"
          )}
        >
          <Animated.View entering={ZoomIn} exiting={FadeOut}>
            <ExternalIcon size={16} className="mr-1" />
          </Animated.View>
          {children}
        </Link>
      </TouchableOpacity>
    </Animated.View>
  );
}
