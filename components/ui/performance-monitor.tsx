import React from 'react';
import { View } from 'react-native';
import { Text } from './text';
import { Badge } from './badge';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { useAppPerformance } from '~/lib/useAppPerformance';
import { usePerformanceStore } from '~/stores/useAppStore';
import { Wifi, WifiOff, Smartphone, Tablet, Activity, AlertTriangle } from 'lucide-react-native';
import Animated, { FadeIn, SlideInRight } from 'react-native-reanimated';

interface PerformanceMonitorProps {
  showDetails?: boolean;
  compact?: boolean;
  className?: string;
}

export function PerformanceMonitor({ 
  showDetails = false, 
  compact = false,
  className = '' 
}: PerformanceMonitorProps) {
  const { 
    isAppActive, 
    networkState, 
    deviceInfo, 
    renderCount,
    isPerformanceOptimal 
  } = useAppPerformance();
  
  const { metrics, errors } = usePerformanceStore();

  if (compact) {
    return (
      <View className={`flex-row items-center space-x-2 ${className}`}>
        {/* Network Status */}
        <View className="flex-row items-center">
          {networkState.isConnected ? (
            <Wifi size={16} className="text-green-500" />
          ) : (
            <WifiOff size={16} className="text-red-500" />
          )}
        </View>
        
        {/* Performance Status */}
        <View className={`w-2 h-2 rounded-full ${
          isPerformanceOptimal ? 'bg-green-500' : 'bg-yellow-500'
        }`} />
        
        {/* Error Indicator */}
        {(errors.jsErrors > 0 || errors.nativeErrors > 0) && (
          <AlertTriangle size={14} className="text-red-500" />
        )}
      </View>
    );
  }

  if (!showDetails) {
    return (
      <Animated.View 
        entering={FadeIn.duration(300)}
        className={`flex-row items-center space-x-3 ${className}`}
      >
        <Badge 
          variant={isPerformanceOptimal ? "success" : "warning"}
          className="flex-row items-center"
        >
          <Activity size={12} className="mr-1" />
          {isPerformanceOptimal ? "优化" : "一般"}
        </Badge>
        
        <Badge 
          variant={networkState.isConnected ? "success" : "destructive"}
          className="flex-row items-center"
        >
          {networkState.isConnected ? (
            <Wifi size={12} className="mr-1" />
          ) : (
            <WifiOff size={12} className="mr-1" />
          )}
          {networkState.isConnected ? "在线" : "离线"}
        </Badge>
        
        <Badge variant="secondary" className="flex-row items-center">
          {deviceInfo.isTablet ? (
            <Tablet size={12} className="mr-1" />
          ) : (
            <Smartphone size={12} className="mr-1" />
          )}
          {deviceInfo.platform}
        </Badge>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={SlideInRight.duration(400)} className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex-row items-center">
            <Activity size={18} className="mr-2" />
            性能监控
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* App Status */}
          <View className="flex-row justify-between items-center">
            <Text className="text-sm text-muted-foreground">应用状态</Text>
            <Badge variant={isAppActive ? "success" : "secondary"}>
              {isAppActive ? "活跃" : "后台"}
            </Badge>
          </View>

          {/* Network Status */}
          <View className="flex-row justify-between items-center">
            <Text className="text-sm text-muted-foreground">网络状态</Text>
            <View className="flex-row items-center">
              {networkState.isConnected ? (
                <Wifi size={16} className="text-green-500 mr-2" />
              ) : (
                <WifiOff size={16} className="text-red-500 mr-2" />
              )}
              <Badge variant={networkState.isConnected ? "success" : "destructive"}>
                {networkState.isConnected ? "已连接" : "未连接"}
              </Badge>
            </View>
          </View>

          {/* Device Info */}
          <View className="flex-row justify-between items-center">
            <Text className="text-sm text-muted-foreground">设备类型</Text>
            <View className="flex-row items-center">
              {deviceInfo.isTablet ? (
                <Tablet size={16} className="text-blue-500 mr-2" />
              ) : (
                <Smartphone size={16} className="text-blue-500 mr-2" />
              )}
              <Badge variant="secondary">
                {deviceInfo.isTablet ? "平板" : "手机"} ({deviceInfo.platform})
              </Badge>
            </View>
          </View>

          {/* Performance Metrics */}
          <View className="space-y-2">
            <Text className="text-sm font-medium">性能指标</Text>
            
            <View className="flex-row justify-between">
              <Text className="text-xs text-muted-foreground">渲染次数</Text>
              <Text className="text-xs">{renderCount}</Text>
            </View>
            
            <View className="flex-row justify-between">
              <Text className="text-xs text-muted-foreground">运行时间</Text>
              <Text className="text-xs">
                {Math.round((Date.now() - metrics.appStartTime) / 1000)}s
              </Text>
            </View>
            
            {(errors.jsErrors > 0 || errors.nativeErrors > 0) && (
              <View className="flex-row justify-between">
                <Text className="text-xs text-muted-foreground">错误数量</Text>
                <Text className="text-xs text-red-500">
                  JS: {errors.jsErrors}, Native: {errors.nativeErrors}
                </Text>
              </View>
            )}
          </View>

          {/* Overall Status */}
          <View className="pt-2 border-t border-border">
            <View className="flex-row justify-between items-center">
              <Text className="text-sm font-medium">整体状态</Text>
              <Badge 
                variant={isPerformanceOptimal ? "success" : "warning"}
                className="flex-row items-center"
              >
                <Activity size={12} className="mr-1" />
                {isPerformanceOptimal ? "优秀" : "需要优化"}
              </Badge>
            </View>
          </View>
        </CardContent>
      </Card>
    </Animated.View>
  );
}

export default PerformanceMonitor;
