import * as React from 'react';
import { View, ScrollView } from 'react-native';
import { Text } from '~/components/ui/text';
import { DownloadSettings } from '~/components/download/center';
import { DownloadForm } from '~/components/download/form';
import DownloadList from '~/components/download/list';
import { Settings } from 'lucide-react-native';
import { Button } from '~/components/ui/button';
import useDownloadStore from '~/stores/useDownloadStore';
import { useAppPerformance } from '~/lib/useAppPerformance';

export default function DownloadScreen() {
  const [showSettings, setShowSettings] = React.useState(false);
  const downloads = useDownloadStore((state) => Array.from(state.downloads.values()));
  const stats = useDownloadStore((state) => state.stats);

  // Monitor performance for download screen
  const { isPerformanceOptimal, networkState } = useAppPerformance();

  return (
    <View className='flex-1 bg-background'>
      <View className="p-4 border-b border-border flex-row justify-between items-center">
        <View>
          <Text className="text-xl font-semibold">下载中心</Text>
          <View className="flex-row items-center space-x-2">
            <Text className="text-sm text-muted-foreground">
              {stats.active > 0 ? `${stats.active} 个正在下载` : '暂无活动下载'}
            </Text>
            {!networkState.isConnected && (
              <View className="w-2 h-2 rounded-full bg-red-500" />
            )}
            {networkState.isConnected && isPerformanceOptimal && (
              <View className="w-2 h-2 rounded-full bg-green-500" />
            )}
          </View>
        </View>
        <Button
          size="icon"
          variant="ghost"
          onPress={() => setShowSettings(true)}
          accessibilityLabel="打开设置"
          accessibilityHint="打开下载设置面板"
        >
          <Settings size={20} />
        </Button>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="p-4">
          <DownloadForm />
          <DownloadList
            downloads={downloads}
            isLoading={false}
          />
        </View>
      </ScrollView>

      <DownloadSettings
        visible={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </View>
  );
}
