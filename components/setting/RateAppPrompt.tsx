import React, { useEffect, useState, useCallback } from "react";
import { View, useWindowDimensions } from "react-native";
import * as StoreReview from "expo-store-review";
import Animated, { FadeIn, FadeOut, BounceIn } from "react-native-reanimated";
import {
  Star,
  StarHalf,
  StarOff,
  Award,
  Heart,
  Smile,
  ThumbsUp,
  MessageCircle,
} from "lucide-react-native";
import Toast from "react-native-toast-message";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface RateAppPromptProps {
  showButton?: boolean;
  promptMessage?: string;
  autoPrompt?: boolean;
  buttonText?: string;
  rating?: number;
  minDaysBeforePrompt?: number;
  minLaunchesBeforePrompt?: number;
}

const RateAppPrompt: React.FC<RateAppPromptProps> = ({
  showButton = true,
  promptMessage = "感谢您使用我们的应用!",
  autoPrompt = false,
  buttonText = "评分",
  rating = 0,
  minDaysBeforePrompt = 3,
  minLaunchesBeforePrompt = 5,
}) => {
  const [canPrompt, setCanPrompt] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentRating, setCurrentRating] = useState(rating);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const showSuccessToast = useCallback(() => {
    Toast.show({
      type: "success",
      text1: "感谢您的评分！",
      text2: "您的反馈对我们非常重要",
      position: "bottom",
      bottomOffset: 80,
    });
  }, []);

  const requestReview = useCallback(async () => {
    try {
      if (await StoreReview.hasAction()) {
        await StoreReview.requestReview();
        setIsSubmitted(true);
        showSuccessToast();
      } else {
        setIsDialogOpen(true);
      }
    } catch (error) {
      console.error("Failed to request review:", error);
      setIsDialogOpen(true);
    }
  }, [showSuccessToast]);

  const checkAvailability = useCallback(async () => {
    const available = await StoreReview.isAvailableAsync();
    setCanPrompt(available);
    if (autoPrompt && available) {
      requestReview();
    }
  }, [autoPrompt, requestReview]);

  useEffect(() => {
    checkAvailability();
  }, [checkAvailability]);

  const handleStarPress = useCallback((rating: number) => {
    setCurrentRating(rating);
    if (rating >= 4) {
      Toast.show({
        type: "info",
        text1: "感谢您的支持！",
        text2: "请继续享受我们的应用",
        position: "bottom",
        bottomOffset: 80,
      });
    }
  }, []);

  const renderStars = () => {
    return (
      <View className="flex-row justify-center items-center gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <Animated.View
            key={star}
            entering={FadeIn.delay(star * 100)}
            exiting={FadeOut}
          >
            {star <= currentRating ? (
              <Star
                size={32}
                className="text-yellow-400"
                onPress={() => handleStarPress(star)}
              />
            ) : star - 0.5 <= currentRating ? (
              <StarHalf
                size={32}
                className="text-yellow-400"
                onPress={() => handleStarPress(star - 0.5)}
              />
            ) : (
              <StarOff
                size={32}
                className="text-muted-foreground"
                onPress={() => handleStarPress(star)}
              />
            )}
          </Animated.View>
        ))}
      </View>
    );
  };

  return (
    <>
      {showButton && canPrompt && (
        <Button
          onPress={requestReview}
          className={isLandscape ? "w-1/3" : "w-full"}
          variant="default"
        >
          <Award className="mr-2 h-4 w-4" />
          {buttonText}
        </Button>
      )}

      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent className={isLandscape ? "w-[80%]" : "sm:max-w-md"}>
          <AlertDialogHeader>
            <AlertDialogTitle>应用评分</AlertDialogTitle>
            <AlertDialogDescription>{promptMessage}</AlertDialogDescription>
          </AlertDialogHeader>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-center">
                <Heart className="inline-block mr-2" />
                请为我们评分
              </CardTitle>
            </CardHeader>
            <CardContent>
              {renderStars()}
              {currentRating > 0 && (
                <Animated.View
                  entering={BounceIn.delay(600)}
                  className="mt-4 flex-row items-center justify-center gap-2"
                >
                  {currentRating >= 4 ? (
                    <>
                      <Smile className="text-green-500" size={24} />
                      <ThumbsUp className="text-green-500" size={24} />
                    </>
                  ) : (
                    <MessageCircle className="text-yellow-500" size={24} />
                  )}
                </Animated.View>
              )}
            </CardContent>
            <Separator className="my-4" />
            <CardFooter className="justify-between">
              <AlertDialogCancel>稍后再说</AlertDialogCancel>
              <AlertDialogAction
                disabled={currentRating === 0}
                onPress={() => {
                  requestReview();
                  setIsDialogOpen(false);
                }}
              >
                提交评分
              </AlertDialogAction>
            </CardFooter>
          </Card>
        </AlertDialogContent>
      </AlertDialog>

      <Toast />
    </>
  );
};

export default RateAppPrompt;
