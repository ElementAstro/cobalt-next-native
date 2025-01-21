import React from 'react';
import { View, Text } from 'react-native';
import { formatBytes } from './format';
import type { DownloadStats as DownloadStatsType } from './types';

interface DownloadStatsProps {
  stats: DownloadStatsType;
}

export const DownloadStats: React.FC<DownloadStatsProps> = ({ stats }) => {
  return (
    <View className="bg-white p-4 mb-4 shadow-sm">
      <View className="flex-row justify-between mb-4">
        <Text className="text-base font-medium">总进度</Text>
        <Text className="text-sm text-gray-600">
          {Math.round(stats.totalProgress * 100)}%
        </Text>
      </View>
      
      <View className="h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
        <View
          className="h-full bg-blue-500"
          style={{ width: `${stats.totalProgress * 100}%` }}
        />
      </View>

      <View className="flex-row justify-between">
        <View>
          <Text className="text-sm text-gray-500">
            {formatBytes(stats.downloadedSize)} / {formatBytes(stats.totalSize)}
          </Text>
          <Text className="text-sm text-gray-500 mt-1">
            总速度: {formatBytes(stats.totalSpeed)}/s
          </Text>
        </View>
        <View>
          <Text className="text-sm text-gray-500">
            活跃: {stats.active} / 总计: {stats.total}
          </Text>
          <Text className="text-sm text-gray-500 mt-1">
            完成: {stats.completed} / 错误: {stats.error}
          </Text>
        </View>
      </View>
    </View>
  );
};
