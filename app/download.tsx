import * as React from 'react';
import { View } from 'react-native';
import { Text } from '~/components/ui/text';
import { DownloadSettings } from '~/components/download/center';
import { Settings } from 'lucide-react-native';
import { Button } from '~/components/ui/button';

export default function DownloadScreen() {
  const [showSettings, setShowSettings] = React.useState(false);

  return (
    <View className='flex-1 bg-background'>
      <View className="p-4 border-b border-border flex-row justify-between items-center">
        <Text className="text-xl font-semibold">下载中心</Text>
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
      
      <View className="flex-1">
        <DownloadSettings
          visible={showSettings}
          onClose={() => setShowSettings(false)}
        />
      </View>
    </View>
  );
}
