import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Button } from "../ui/button";
import { Text } from "../ui/text";
import { Share2, Trash } from "lucide-react-native";

interface OperationBarProps {
  selectedCount: number;
  onShare: () => void;
  onDelete: () => void;
}

const styles = StyleSheet.create({
  container: {
    height: 56,
    backgroundColor: "#007AFF",
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  text: {
    color: "#FFFFFF",
    fontWeight: "500",
    fontSize: 16,
  },
  buttonsContainer: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
});

export default function OperationBar({
  selectedCount,
  onShare,
  onDelete,
}: OperationBarProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(50);

  useEffect(() => {
    if (selectedCount > 0) {
      opacity.value = withSpring(1);
      translateY.value = withSpring(0);
    } else {
      opacity.value = withTiming(0);
      translateY.value = withTiming(50);
    }
  }, [selectedCount]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <Text style={styles.text}>Selected {selectedCount} items</Text>
      <View style={styles.buttonsContainer}>
        <Button variant="ghost" onPress={onShare}>
          <Share2 color="white" size={20} />
        </Button>
        <Button variant="ghost" onPress={onDelete}>
          <Trash color="white" size={20} />
        </Button>
      </View>
    </Animated.View>
  );
}
