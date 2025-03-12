import { useState, useEffect } from "react";
import { Dimensions } from "react-native";

export function useOrientation() {
  const [isLandscape, setIsLandscape] = useState(
    Dimensions.get("window").width > Dimensions.get("window").height
  );

  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setIsLandscape(window.width > window.height);
    });

    return () => subscription.remove();
  }, []);

  return isLandscape;
}
