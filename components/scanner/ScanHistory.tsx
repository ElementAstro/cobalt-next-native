import React from 'react';
import { View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Text } from '@/components/ui/text';
import { Label } from '@/components/ui/label';
import { Clock, ChevronRight, History, AlertCircle } from 'lucide-react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import * as Haptics from "expo-haptics";

interface ScanHistoryItem {
  id: string;
  timestamp: Date;
  ipAddress: string;
  portRange: string;
  openPorts: number;
  totalPorts: number;
  status?: "success" | "error";
}

interface ScanHistoryProps {
  history: ScanHistoryItem[];
  onSelectHistory: (item: ScanHistoryItem) => void;
  isLoading?: boolean;
  error?: string | null;
}

const ScanHistory: React.FC<ScanHistoryProps> = ({ 
  history, 
  onSelectHistory,
  isLoading = false,
  error = null
}) => {
  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center p-8">
        <ActivityIndicator size="large" />
        <Label className="mt-4 text-gray-500">加载历史记录中...</Label>
      </View>
    );
  }

  if (error) {
    return (
      <Animated.View 
        entering={FadeIn.duration(300)}
        exiting={FadeOut.duration(200)}
        className="flex-1 items-center justify-center p-8"
      >
        <AlertCircle size={32} className="text-red-500 mb-4" />
        <Label className="text-red-500 text-center">{error}</Label>
      </Animated.View>
    );
  }

  if (history.length === 0) {
    return (
      <Animated.View 
        entering={FadeIn.duration(300)}
        exiting={FadeOut.duration(200)}
        className="flex-1 items-center justify-center p-8"
      >
        <History size={32} className="text-gray-400 mb-4" />
        <Label className="text-gray-500">暂无历史记录</Label>
      </Animated.View>
    );
  }

  return (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false} 
      className="px-4"
      contentContainerStyle={{ paddingRight: 16 }}
    >
      {history.map((item, index) => (
        <Animated.View 
          key={item.id}
          entering={FadeIn.delay(index * 100)}
          className="mr-4"
        >
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSelectHistory(item);
            }}
            className={`bg-white dark:bg-gray-800 rounded-lg p-4 w-64 shadow-sm ${
              item.status === "error" ? "border border-red-500" : ""
            }`}
          >
            <View className="flex-row items-center justify-between mb-2">
              <Clock size={16} className="text-gray-500" />
              <Text className="text-xs text-gray-500">
                {new Date(item.timestamp).toLocaleString()}
              </Text>
            </View>
            <Label className="text-lg mb-1">{item.ipAddress}</Label>
            <Text className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              {item.portRange}
            </Text>
            <View className="flex-row justify-between items-center">
              <Text className={`text-sm ${
                item.status === "error" ? "text-red-500" : "text-blue-500"
              }`}>
                开放端口: {item.openPorts}/{item.totalPorts}
              </Text>
              {item.status === "error" ? (
                <AlertCircle size={16} className="text-red-500" />
              ) : (
                <ChevronRight size={16} className="text-gray-400" />
              )}
            </View>
          </Pressable>
        </Animated.View>
      ))}
    </ScrollView>
  );
};

export default React.memo(ScanHistory);
