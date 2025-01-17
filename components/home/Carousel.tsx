import React, { useState, useRef, useEffect } from "react";
import {
  SafeAreaView,
  Pressable,
  View,
  Text,
  ScrollView,
  Image,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  withTiming,
  useAnimatedStyle,
  SharedValue,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import {
  Star,
  Heart,
  Info,
  Bluetooth,
  Camera,
  Bookmark,
} from "lucide-react-native";
import Toast from "react-native-toast-message";

interface CarouselItem {
  image: string;
  ar: number;
  title: string;
  description: string;
}

interface GalleryCarouselProps {
  items: CarouselItem[];
  height?: number;
}

const CARD_WIDTH = 300;
const AUTOPLAY_INTERVAL = 3000; // 3秒自动播放

// SVG Arrow Components
export const ArrowLeft = ({ stroke = "black" }) => {
  return (
    <Svg
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke={stroke}
      height={24}
      width={24}
    >
      <Path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 12h-15m0 0l6.75 6.75M4.5 12l6.75-6.75"
      />
    </Svg>
  );
};

export const ArrowRight = ({ stroke = "black" }) => {
  return (
    <Svg
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke={stroke}
      height={24}
      width={24}
    >
      <Path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75"
      />
    </Svg>
  );
};

// Gallery Carousel Component
const GalleryCarousel: React.FC<GalleryCarouselProps> = ({
  items,
  height = 200,
}) => {
  const scrollXOffset = useSharedValue(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const autoplayRef = useRef<NodeJS.Timeout | null>(null);

  // 自动播放功能
  useEffect(() => {
    autoplayRef.current = setInterval(() => {
      let nextIndex = currentIndex + 1;
      if (nextIndex >= items.length) {
        nextIndex = 0;
      }
      scrollRef.current?.scrollTo({
        x: nextIndex * CARD_WIDTH,
        animated: true,
      });
      setCurrentIndex(nextIndex);
      Toast.show({
        type: "info",
        text1: `滑动到: ${items[nextIndex].title}`,
        visibilityTime: 1500,
      });
    }, AUTOPLAY_INTERVAL);

    return () => {
      if (autoplayRef.current) {
        clearInterval(autoplayRef.current);
      }
    };
  }, [currentIndex, items]);

  // Scroll handler to update current scroll position
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollXOffset.value = event.contentOffset.x;
      const index = Math.round(event.contentOffset.x / CARD_WIDTH);
      setCurrentIndex(index);
    },
  });

  // Navigation functions
  const goToPrevious = () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      scrollRef.current?.scrollTo({
        x: prevIndex * CARD_WIDTH,
        animated: true,
      });
      setCurrentIndex(prevIndex);
      Toast.show({
        type: "success",
        text1: "向左滑动",
        visibilityTime: 1000,
      });
    }
  };

  const goToNext = () => {
    if (currentIndex < items.length - 1) {
      const nextIndex = currentIndex + 1;
      scrollRef.current?.scrollTo({
        x: nextIndex * CARD_WIDTH,
        animated: true,
      });
      setCurrentIndex(nextIndex);
      Toast.show({
        type: "success",
        text1: "向右滑动",
        visibilityTime: 1000,
      });
    }
  };

  return (
    <SafeAreaView className="flex-1 justify-center bg-white">
      <View className="overflow-visible">
        <ScrollView
          ref={scrollRef}
          horizontal
          onScroll={scrollHandler}
          showsHorizontalScrollIndicator={false}
          snapToInterval={CARD_WIDTH}
          scrollEventThrottle={16}
          decelerationRate="fast"
          className="overflow-visible"
          contentContainerStyle={{
            overflow: "visible",
            paddingLeft: 16,
            paddingRight: 16,
          }}
        >
          {items.map((item, index) => (
            <GalleryCarouselItem
              key={index}
              item={item}
              index={index}
              scrollXOffset={scrollXOffset}
              height={height}
            />
          ))}
        </ScrollView>

        {/* 控制按钮 */}
        <View className="px-4 flex flex-row justify-between pt-5">
          <Pressable
            disabled={currentIndex === 0}
            onPress={goToPrevious}
            className={`mr-2 p-2 rounded-xl ${
              currentIndex === 0 ? "bg-gray-200" : "bg-gray-100"
            }`}
          >
            <ArrowLeft stroke={currentIndex === 0 ? "#d1d5db" : "black"} />
          </Pressable>
          <Pressable
            disabled={currentIndex === items.length - 1}
            onPress={goToNext}
            className={`p-2 rounded-xl ${
              currentIndex === items.length - 1 ? "bg-gray-200" : "bg-gray-100"
            }`}
          >
            <ArrowRight
              stroke={currentIndex === items.length - 1 ? "#d1d5db" : "black"}
            />
          </Pressable>
        </View>

        {/* 分页指示器 */}
        <View className="flex-row justify-center mt-4">
          {items.map((_, index) => (
            <View
              key={index}
              className={`mx-1 rounded-full ${
                currentIndex === index
                  ? "w-3 h-3 bg-black"
                  : "w-2 h-2 bg-gray-300"
              }`}
            />
          ))}
        </View>
      </View>
      <Toast />
    </SafeAreaView>
  );
};

// Gallery Carousel Item Component
interface GalleryCarouselItemProps {
  item: CarouselItem;
  index: number;
  scrollXOffset: SharedValue<number>;
  height: number;
}

const GalleryCarouselItem: React.FC<GalleryCarouselItemProps> = ({
  item,
  index,
  scrollXOffset,
  height,
}) => {
  const animatedStyle = useAnimatedStyle(() => {
    const scale =
      1 - Math.min(Math.abs(scrollXOffset.value / CARD_WIDTH - index), 1) * 0.2;
    const opacity =
      1 - Math.min(Math.abs(scrollXOffset.value / CARD_WIDTH - index), 1) * 0.5;
    return {
      transform: [{ scale: withTiming(scale) }],
      opacity: withTiming(opacity),
    };
  });

  return (
    <Animated.View
      className="w-[300px] mx-2 rounded-lg overflow-hidden shadow-md"
      style={[{ height }, animatedStyle]}
    >
      <Image source={{ uri: item.image }} className="w-full h-full" />
      <View className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 p-2">
        <Text className="text-white text-lg font-bold">{item.title}</Text>
        <Text className="text-white text-sm">{item.description}</Text>
        <View className="flex-row mt-2">
          <Star stroke="yellow" />
          <Heart stroke="red" className="ml-2" />
          <Info stroke="blue" className="ml-2" />
          <Bluetooth stroke="cyan" className="ml-2" />
          <Camera stroke="purple" className="ml-2" />
          <Bookmark stroke="orange" className="ml-2" />
        </View>
      </View>
    </Animated.View>
  );
};

export default GalleryCarousel;
