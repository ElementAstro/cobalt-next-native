import React, { memo, useState, useCallback, useRef, useEffect } from "react";
import {
  Folder,
  File,
  Image as ImageIcon,
  Music,
  Video,
  Share2,
  Edit2,
  Trash,
  Copy,
  Move,
  Download,
  Eye,
  Star,
  Clock,
  Info,
  Lock,
  Loader2,
} from "lucide-react-native";
import { View, Image, TouchableOpacity, Dimensions, Pressable, Platform, AccessibilityInfo } from "react-native";
import Animated, {
  FadeIn,
  FadeInRight,
  FadeOut,
  Layout,
  SlideInUp,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  Easing,
  ZoomIn,
  ZoomOut,
} from "react-native-reanimated";
import { FileItem as FileItemType } from "~/stores/useImageStore";
import { useColorScheme } from "nativewind";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import { Badge } from "~/components/ui/badge";
import * as Haptics from "expo-haptics";

const AnimatedCard = Animated.createAnimatedComponent(Card);
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface FileItemProps {
  file: FileItemType;
  index: number;
  isLandscape: boolean;
  isSelected?: boolean;
  onFileAction: (file: FileItemType, action: string) => void;
  onLongPress?: () => void;
  onPress?: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_SIZE = SCREEN_WIDTH * 0.28;

export const FileItem = memo(({
  file,
  index,
  isLandscape,
  isSelected,
  onFileAction,
  onLongPress,
  onPress,
}: FileItemProps) => {
  const [thumbnailError, setThumbnailError] = useState(false);
  const [thumbnailLoading, setThumbnailLoading] = useState(true);
  const [showActions, setShowActions] = useState(false);
  const { colorScheme } = useColorScheme();
  const itemRef = useRef<View>(null);
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState(false);
  
  // 动画值
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const elevation = useSharedValue(2);
  const rotation = useSharedValue(0);
  
  // 检查屏幕阅读器状态
  useEffect(() => {
    let isMounted = true;
    const checkScreenReader = async () => {
      const isEnabled = await AccessibilityInfo.isScreenReaderEnabled();
      if (isMounted) {
        setIsScreenReaderEnabled(isEnabled);
      }
    };
    
    checkScreenReader();
    const subscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      setIsScreenReaderEnabled
    );
    
    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  // 处理动画样式
  useEffect(() => {
    if (isSelected) {
      scale.value = withSpring(0.95, { damping: 12 });
      opacity.value = withSpring(0.9);
      elevation.value = withSpring(8);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      scale.value = withSpring(1, { damping: 15 });
      opacity.value = withSpring(1);
      elevation.value = withSpring(2);
    }
  }, [isSelected]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scale.value },
        { rotateZ: `${rotation.value}deg` }
      ],
      opacity: opacity.value,
      elevation: elevation.value,
    };
  });

  const getFileIcon = useCallback((file: FileItemType) => {
    if (file.isDirectory) return <Folder className="h-8 w-8 text-primary" />;
    const ext = file.name.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
      case "webp":
        return <ImageIcon className="h-8 w-8 text-blue-500" />;
      case "mp3":
      case "wav":
      case "ogg":
      case "flac":
        return <Music className="h-8 w-8 text-green-500" />;
      case "mp4":
      case "mov":
      case "avi":
      case "mkv":
      case "webm":
        return <Video className="h-8 w-8 text-purple-500" />;
      default:
        return <File className="h-8 w-8 text-muted-foreground" />;
    }
  }, []);

  const formatFileSize = useCallback((size?: number) => {
    if (!size) return 'N/A';
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  }, []);

  const renderThumbnail = useCallback(() => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    const isImage = ["jpg", "jpeg", "png", "gif", "webp"].includes(ext || "");

    if (isImage && !thumbnailError && file.uri) {
      return (
        <View className="relative w-full h-full">
          {thumbnailLoading && (
            <Animated.View 
              className="absolute inset-0 items-center justify-center bg-muted/10 rounded-xl"
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(200)}
            >
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </Animated.View>
          )}
          <Image
            source={{ uri: file.uri }}
            className="w-full h-full rounded-xl"
            style={{ width: ITEM_SIZE, height: ITEM_SIZE }}
            onLoadStart={() => setThumbnailLoading(true)}
            onLoadEnd={() => setThumbnailLoading(false)}
            onError={() => {
              setThumbnailError(true);
              setThumbnailLoading(false);
            }}
            resizeMode="cover"
          />
        </View>
      );
    }

    return (
      <Animated.View 
        className="w-full h-full items-center justify-center bg-muted/10 rounded-xl"
        style={{ width: ITEM_SIZE, height: ITEM_SIZE }}
        entering={ZoomIn.duration(300).springify()}
      >
        {getFileIcon(file)}
      </Animated.View>
    );
  }, [file, thumbnailError, thumbnailLoading, getFileIcon]);

  const fileActions = [
    { icon: Eye, action: "preview", label: "预览" },
    { icon: Share2, action: "share", label: "分享" },
    { icon: Edit2, action: "rename", label: "重命名" },
    { icon: Download, action: "download", label: "下载" },
    { icon: Star, action: "star", label: "收藏" },
    { icon: Info, action: "info", label: "详情" },
    { icon: Lock, action: "lock", label: "加密" },
    { icon: Trash, action: "delete", label: "删除" },
  ];

  const handlePress = () => {
    scale.value = withSequence(
      withTiming(0.95, { duration: 100 }),
      withTiming(1, { duration: 200 })
    );
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
    
    if (!showActions) {
      setShowActions(true);
    }
  };
  
  const handleLongPress = () => {
    rotation.value = withSequence(
      withTiming(-3, { duration: 100 }),
      withTiming(3, { duration: 100 }),
      withTiming(0, { duration: 100 })
    );
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onLongPress?.();
  };
  
  const handleActionPress = (action: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onFileAction(file, action);
    setShowActions(false);
  };

  return (
    <AnimatedTouchable
      ref={itemRef}
      onPress={handlePress}
      onLongPress={handleLongPress}
      delayLongPress={300}
      activeOpacity={0.7}
      style={animatedStyle}
      accessible={true}
      accessibilityLabel={`${file.isDirectory ? '文件夹' : '文件'}: ${file.name}, 大小: ${formatFileSize(file.size)}`}
      accessibilityRole="button"
      accessibilityHint="点击查看详情，长按选择操作"
      accessibilityState={{ selected: isSelected }}
    >
      <AnimatedCard
        entering={FadeInRight.delay(index * 50).springify()}
        layout={Layout.springify()}
        className={`
          overflow-hidden bg-background/95 backdrop-blur
          ${isSelected ? "border-primary border-2" : "border border-border/50"}
          ${isLandscape ? "p-2" : "p-3"}
        `}
      >
        <View className="space-y-3">
          {renderThumbnail()}
          
          <View className="space-y-1">
            <Text
              numberOfLines={1}
              className={`font-medium ${isLandscape ? "text-sm" : "text-base"}`}
            >
              {file.name}
            </Text>
            
            <View className="flex-row items-center space-x-2">
              <Badge
                variant="secondary"
                className="rounded-full px-2 py-0"
              >
                <Clock className="h-3 w-3 mr-1" />
                <Text className="text-xs">
                  {new Date(file.modificationTime || 0).toLocaleDateString()}
                </Text>
              </Badge>
              
              {file.size && (
                <Badge
                  variant="outline"
                  className="rounded-full px-2 py-0"
                >
                  <Text className="text-xs">{formatFileSize(file.size)}</Text>
                </Badge>
              )}
            </View>
          </View>

          {showActions && (
            <Animated.View
              entering={SlideInUp.duration(200).springify()}
              exiting={FadeOut.duration(150)}
              className="flex-row flex-wrap gap-1 mt-2"
            >
              {fileActions.map(({ icon: Icon, action, label }) => (
                <Button
                  key={action}
                  variant="ghost"
                  size="sm"
                  className="flex-1 h-8 min-w-[80px] rounded-lg"
                  onPress={() => handleActionPress(action)}
                  accessibilityLabel={`${label} ${file.name}`}
                  accessibilityRole="button"
                >
                  <Icon className="h-4 w-4 mr-1" />
                  <Text className="text-xs">{label}</Text>
                </Button>
              ))}
            </Animated.View>
          )}
        </View>
      </AnimatedCard>
    </AnimatedTouchable>
  );
});

FileItem.displayName = "FileItem";

export default FileItem;
