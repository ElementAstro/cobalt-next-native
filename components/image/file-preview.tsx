import React, { useState, useCallback } from 'react';
import { View, Image, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import * as Sharing from 'expo-sharing';
import {
  Image as ImageIcon,
  FileText,
  Video as VideoIcon,
  Download,
  Share2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
} from 'lucide-react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { FileItem as FileItemType } from '~/stores/useImageStore';
import { Button } from '~/components/ui/button';
import { Text } from '~/components/ui/text';
import { Card } from '~/components/ui/card';
import { Progress } from '~/components/ui/progress';

interface FilePreviewProps {
  file: FileItemType;
  onShare?: () => Promise<void>;
  onDownload?: () => Promise<void>;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const FilePreview: React.FC<FilePreviewProps> = ({
  file,
  onShare,
  onDownload,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [videoStatus, setVideoStatus] = useState<AVPlaybackStatus | null>(null);
  const [imageScale, setImageScale] = useState(1);
  const [imageRotation, setImageRotation] = useState(0);

  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: withSpring(scale.value) },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  const handleLoadStart = () => {
    setIsLoading(true);
    setError(null);
  };

  const handleLoadEnd = () => {
    setIsLoading(false);
    setLoadingProgress(100);
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    setIsLoading(false);
  };

  const handleZoom = (zoomIn: boolean) => {
    const newScale = zoomIn ? imageScale * 1.2 : imageScale / 1.2;
    setImageScale(Math.max(0.5, Math.min(3, newScale)));
    scale.value = Math.max(0.5, Math.min(3, newScale));
  };

  const handleRotate = () => {
    const newRotation = (imageRotation + 90) % 360;
    setImageRotation(newRotation);
    rotation.value = withSpring(newRotation);
  };

  const renderPreviewContent = useCallback(() => {
    const ext = file.name.split('.').pop()?.toLowerCase();

    switch (ext) {
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif': {
        const ImagePreview = () => (
          <Animated.View style={animatedStyle} className="items-center">
            <Image
              source={{ uri: file.uri }}
              style={{
                width: SCREEN_WIDTH * 0.9,
                height: SCREEN_WIDTH * 0.9,
                maxHeight: SCREEN_HEIGHT * 0.6,
              }}
              resizeMode={ResizeMode.CONTAIN}
              onLoadStart={handleLoadStart}
              onLoadEnd={handleLoadEnd}
              onError={() => handleError('图片加载失败')}
            />
            <View className="flex-row justify-center space-x-2 mt-4">
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-full"
                onPress={() => handleZoom(true)}
              >
                <ZoomIn className="h-5 w-5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-full"
                onPress={() => handleZoom(false)}
              >
                <ZoomOut className="h-5 w-5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-full"
                onPress={handleRotate}
              >
                <RotateCw className="h-5 w-5" />
              </Button>
            </View>
          </Animated.View>
        );
        return <ImagePreview />;
      }

      case 'mp4':
      case 'mov': {
        const VideoPreview = () => (
          <View className="items-center">
            <Video
              source={{ uri: file.uri }}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              isLooping={false}
              onPlaybackStatusUpdate={setVideoStatus}
              style={{
                width: SCREEN_WIDTH * 0.9,
                height: SCREEN_WIDTH * 0.9 * (9/16),
                maxHeight: SCREEN_HEIGHT * 0.6,
              }}
              className="rounded-lg"
            />
            {videoStatus?.isLoaded && (
              <Progress
                value={
                  (videoStatus.positionMillis / videoStatus.durationMillis!) * 100
                }
                className="w-full mt-4"
              />
            )}
          </View>
        );
        return <VideoPreview />;
      }

      case 'pdf':
      case 'doc':
      case 'docx': {
        const DocumentPreview = () => (
          <View className="flex-1 overflow-hidden rounded-lg">
            <WebView
              source={{ uri: file.uri }}
              onLoadStart={handleLoadStart}
              onLoadEnd={handleLoadEnd}
              onError={() => handleError('文档加载失败')}
              className="w-full h-full"
            />
          </View>
        );
        return <DocumentPreview />;
      }

      default: {
        const UnsupportedPreview = () => (
          <Card className="p-8 items-center space-y-4 bg-background/95 backdrop-blur">
            <FileText className="h-16 w-16 text-muted-foreground" />
            <Text className="text-lg font-medium">无法预览此类型文件</Text>
            <Text className="text-sm text-muted-foreground text-center">
              当前不支持预览 .{ext} 格式的文件
            </Text>
          </Card>
        );
        return <UnsupportedPreview />;
      }
    }
  }, [file, imageScale, imageRotation, videoStatus]);

  return (
    <View className="flex-1">
      <Animated.View
        entering={FadeIn.duration(300)}
        className="flex-1 items-center justify-center p-4"
      >
        {isLoading && (
          <View className="absolute z-10 top-1/2 left-4 right-4 -mt-8">
            <Progress value={loadingProgress} className="w-full mb-2" />
            <Text className="text-center text-sm text-muted-foreground">
              正在加载...
            </Text>
          </View>
        )}

        {error ? (
          <Card className="p-6 items-center space-y-4 bg-destructive/10">
            <FileText className="h-12 w-12 text-destructive" />
            <Text className="text-destructive">{error}</Text>
          </Card>
        ) : (
          renderPreviewContent()
        )}

        <View className="absolute bottom-4 right-4 flex-row space-x-2">
          {onShare && (
            <Button
              variant="secondary"
              size="icon"
              className="h-12 w-12 rounded-full shadow-lg"
              onPress={onShare}
            >
              <Share2 className="h-5 w-5" />
            </Button>
          )}
          {onDownload && (
            <Button
              variant="secondary"
              size="icon"
              className="h-12 w-12 rounded-full shadow-lg"
              onPress={onDownload}
            >
              <Download className="h-5 w-5" />
            </Button>
          )}
        </View>
      </Animated.View>
    </View>
  );
};

export default React.memo(FilePreview);
