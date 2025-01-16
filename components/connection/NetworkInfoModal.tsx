import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  Button,
  TouchableOpacity,
  Animated,
} from "react-native";
import * as Network from "expo-network";
import { XCircle } from "lucide-react-native"; // 引入 lucide-react-native 图标

// 定义 NetworkState 类型，便于 TypeScript 的类型推断
interface NetworkState {
  isConnected?: boolean;
  isInternetReachable?: boolean;
  type?: string;
}

interface NetworkInfoModalProps {
  visible: boolean;
  onClose: () => void;
}

const NetworkInfoModal: React.FC<NetworkInfoModalProps> = ({
  visible,
  onClose,
}) => {
  const [ipAddress, setIpAddress] = useState<string>("");
  const [networkState, setNetworkState] = useState<NetworkState | null>(null);
  const [isAirplaneMode, setIsAirplaneMode] = useState<boolean>(false);

  // 动画状态
  const [fadeAnim] = useState(new Animated.Value(0)); // 控制透明度
  const [slideAnim] = useState(new Animated.Value(-300)); // 控制弹窗滑动

  // 获取网络信息的函数
  const fetchNetworkInfo = async () => {
    try {
      const ip = await Network.getIpAddressAsync();
      const state = await Network.getNetworkStateAsync();
      const airplaneMode = await Network.isAirplaneModeEnabledAsync();

      setIpAddress(ip);
      setNetworkState(state);
      setIsAirplaneMode(airplaneMode);
    } catch (error) {
      console.error("Error fetching network info:", error);
    }
  };

  // 弹窗显示或关闭时的动画效果
  useEffect(() => {
    if (visible) {
      // 弹窗显示时，执行渐显和滑动动画
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();

      fetchNetworkInfo(); // 每次弹窗显示时获取网络信息
    } else {
      // 弹窗关闭时，恢复到初始状态
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();

      Animated.timing(slideAnim, {
        toValue: -300,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  return (
    <Modal
      animationType="none" // 自定义动画
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <Animated.View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          opacity: fadeAnim,
        }}
      >
        <Animated.View
          style={{
            width: "90%",
            backgroundColor: "#fff",
            borderRadius: 10,
            padding: 20,
            transform: [{ translateY: slideAnim }],
          }}
        >
          {/* 关闭按钮 */}
          <TouchableOpacity
            onPress={onClose}
            style={{ position: "absolute", top: 10, right: 10 }}
          >
            <XCircle size={24} color="black" />{" "}
            {/* 使用 lucide-react-native 图标 */}
          </TouchableOpacity>

          <Text className="text-2xl font-bold text-center mb-4">网络信息</Text>
          <Text className="text-lg mb-2">
            IP 地址: {ipAddress || "加载中..."}
          </Text>
          <Text className="text-lg mb-2">
            网络状态: {networkState ? networkState.type : "加载中..."}
          </Text>
          <Text className="text-lg mb-2">
            飞行模式: {isAirplaneMode ? "是" : "否"}
          </Text>

          {/* 网络状态详情 */}
          {networkState && (
            <View>
              <Text className="text-sm text-gray-500 mt-4">
                连接状态: {networkState.isConnected ? "已连接" : "未连接"}
              </Text>
              <Text className="text-sm text-gray-500">
                网络可达: {networkState.isInternetReachable ? "是" : "否"}
              </Text>
            </View>
          )}

          {/* 刷新按钮 */}
          <Button title="刷新网络信息" onPress={fetchNetworkInfo} />
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

export default NetworkInfoModal;
