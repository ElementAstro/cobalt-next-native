import React, { useEffect, useState, useCallback } from "react";
import { View, useWindowDimensions } from "react-native";
import * as StoreReview from "expo-store-review";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { Star, StarHalf, StarOff, Award, Heart } from "lucide-react-native";

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
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const requestReview = useCallback(async () => {
    try {
      if (await StoreReview.hasAction()) {
        await StoreReview.requestReview();
      } else {
        setIsDialogOpen(true);
      }
    } catch (error) {
      console.error("Failed to request review:", error);
      setIsDialogOpen(true);
    }
  }, []);
  
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
              <Star size={32} className="text-yellow-400" />
            ) : star - 0.5 <= currentRating ? (
              <StarHalf size={32} className="text-yellow-400" />
            ) : (
              <StarOff size={32} className="text-muted-foreground" />
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
        <AlertDialogContent className="sm:max-w-md">
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
            <CardContent>{renderStars()}</CardContent>
            <Separator className="my-4" />
            <CardFooter className="justify-between">
              <AlertDialogCancel>稍后再说</AlertDialogCancel>
              <AlertDialogAction
                disabled={currentRating === 0}
                onPress={requestReview}
              >
                提交评分
              </AlertDialogAction>
            </CardFooter>
          </Card>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default RateAppPrompt;
