import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { Label } from '@/components/ui/label';
import { Clock, ChevronRight } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

interface ScanHistoryItem {
  id: string;
  timestamp: Date;
  ipAddress: string;
  portRange: string;
  openPorts: number;
  totalPorts: number;
}

interface ScanHistoryProps {
  history: ScanHistoryItem[];
  onSelectHistory: (item: ScanHistoryItem) => void;
}

const ScanHistory: React.FC<ScanHistoryProps> = ({ history, onSelectHistory }) => {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4">
      {history.map((item, index) => (
        <Animated.View 
          key={item.id}
          entering={FadeIn.delay(index * 100)}
          className="mr-4"
        >
          <Pressable
            onPress={() => onSelectHistory(item)}
            className="bg-white dark:bg-gray-800 rounded-lg p-4 w-64 shadow-sm"
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
              <Text className="text-sm text-blue-500">
                开放端口: {item.openPorts}/{item.totalPorts}
              </Text>
              <ChevronRight size={16} className="text-gray-400" />
            </View>
          </Pressable>
        </Animated.View>
      ))}
    </ScrollView>
  );
};

export default React.memo(ScanHistory);
