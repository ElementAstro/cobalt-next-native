import React, { useState } from "react";
import { Text, View, Modal, Dimensions } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { X, RefreshCw, Share2 } from "lucide-react-native";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInUp,
  SlideOutDown,
} from "react-native-reanimated";
import { Button as CustomButton } from "@/components/ui/button";

interface WebBrowserModalProps {
  visible: boolean;
  url: string;
  onClose: () => void;
  onSuccess?: (result: WebBrowser.WebBrowserResult) => void;
  onCancel?: (result: WebBrowser.WebBrowserResult) => void;
}

const WebBrowserModal: React.FC<WebBrowserModalProps> = ({
  visible,
  url,
  onClose,
  onSuccess,
  onCancel,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<string | null>(null);

  const openBrowser = async () => {
    setLoading(true);
    try {
      const result = await WebBrowser.openBrowserAsync(url);
      if (result.type === "opened") {
        setResult("网页已成功打开");
        onSuccess && onSuccess(result);
      } else if (result.type === "cancel") {
        setResult("用户取消了网页打开");
        onCancel && onCancel(result);
      }
    } catch (error) {
      setResult("打开网页时出现错误");
      console.error("WebBrowser error:", error);
    } finally {
      setLoading(false);
    }
  };

  const { width, height } = Dimensions.get("window");
  const isLandscape = width > height;

  return (
    <Modal visible={visible} animationType="none" transparent>
      <Animated.View
        entering={FadeIn.duration(300)}
        exiting={FadeOut.duration(300)}
        className="flex-1 justify-center items-center bg-black bg-opacity-50"
      >
        <Animated.View
          entering={SlideInUp.duration(300)}
          exiting={SlideOutDown.duration(300)}
          className={`bg-white p-5 rounded-lg ${
            isLandscape ? "w-3/5 max-w-md" : "w-4/5 max-w-sm"
          } items-center`}
        >
          <View className="w-full flex-row justify-between items-center mb-2.5">
            <Text className="text-lg font-bold">跳转到外部网页</Text>
            <CustomButton variant="ghost" size="icon" onPress={onClose}>
              <X size={20} />
            </CustomButton>
          </View>
          <Text className="text-base mb-5 text-center">{url}</Text>
          <View className="w-full items-center">
            <CustomButton
              variant="outline"
              onPress={openBrowser}
              disabled={loading}
              className="flex-row items-center justify-center"
            >
              {loading ? <RefreshCw size={16} /> : <Share2 size={16} />}
              <Text className="ml-2">{loading ? "加载中..." : "打开网页"}</Text>
            </CustomButton>
            {result && (
              <Text className="mt-2 text-sm text-gray-500">{result}</Text>
            )}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

export default WebBrowserModal;
