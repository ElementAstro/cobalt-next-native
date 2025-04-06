import * as Haptics from "expo-haptics";
import { useCallback } from "react";

type HapticType =
  | "light"
  | "medium"
  | "heavy"
  | "success"
  | "warning"
  | "error";

export function useHapticFeedback() {
  const trigger = useCallback((type: HapticType) => {
    switch (type) {
      case "light":
        return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      case "medium":
        return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      case "heavy":
        return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      case "success":
        return Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        );
      case "warning":
        return Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Warning
        );
      case "error":
        return Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Error
        );
      default:
        return Promise.resolve();
    }
  }, []);

  return { trigger };
}
