/**
 * Unified notification system for all app features
 * Provides consistent user feedback across the application
 */

import React, { useEffect } from 'react';
import { View, Pressable } from 'react-native';
import Animated, { 
  FadeInUp, 
  FadeOutUp, 
  SlideInRight, 
  SlideOutRight,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS
} from 'react-native-reanimated';
import { 
  CheckCircle, 
  AlertCircle, 
  Info, 
  X, 
  AlertTriangle,
  Zap
} from 'lucide-react-native';
import { Text } from '~/components/ui/text';
import { Card, CardContent } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { useErrorNotifications } from '~/lib/error-handling/use-error-handling';
import { toast } from 'sonner-native';

interface NotificationSystemProps {
  position?: 'top' | 'bottom';
  maxNotifications?: number;
}

export function NotificationSystem({ 
  position = 'top',
  maxNotifications = 5 
}: NotificationSystemProps) {
  const { notifications, dismissNotification } = useErrorNotifications();

  // Show toast notifications for simple messages
  useEffect(() => {
    notifications.forEach(notification => {
      if (notification.type === 'toast') {
        const icon = getNotificationIcon(notification.error.severity);
        
        toast(notification.title, {
          description: notification.message,
          icon,
          duration: notification.duration || 5000,
          action: notification.actions?.[0] ? {
            label: notification.actions[0].label,
            onClick: notification.actions[0].action,
          } : undefined,
        });
        
        // Dismiss from our system since toast handles it
        dismissNotification(notification.id);
      }
    });
  }, [notifications, dismissNotification]);

  // Filter notifications for banner/modal display
  const displayNotifications = notifications
    .filter(n => n.type === 'banner' || n.type === 'modal')
    .slice(0, maxNotifications);

  if (displayNotifications.length === 0) {
    return null;
  }

  return (
    <View 
      className={`absolute left-4 right-4 z-50 ${
        position === 'top' ? 'top-16' : 'bottom-16'
      }`}
      pointerEvents="box-none"
    >
      <View className="space-y-2">
        {displayNotifications.map((notification, index) => (
          <NotificationCard
            key={notification.id}
            notification={notification}
            index={index}
            onDismiss={() => dismissNotification(notification.id)}
            position={position}
          />
        ))}
      </View>
    </View>
  );
}

interface NotificationCardProps {
  notification: any;
  index: number;
  onDismiss: () => void;
  position: 'top' | 'bottom';
}

function NotificationCard({ 
  notification, 
  index, 
  onDismiss, 
  position 
}: NotificationCardProps) {
  const progress = useSharedValue(1);
  const { error, title, message, actions, duration, autoHide } = notification;

  useEffect(() => {
    if (autoHide && duration) {
      progress.value = withTiming(0, { duration }, (finished) => {
        if (finished) {
          runOnJS(onDismiss)();
        }
      });
    }
  }, [autoHide, duration, onDismiss, progress]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  const getBackgroundColor = () => {
    switch (error.severity) {
      case 'critical':
        return 'bg-red-50 border-red-200';
      case 'high':
        return 'bg-orange-50 border-orange-200';
      case 'medium':
        return 'bg-yellow-50 border-yellow-200';
      case 'low':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getIconColor = () => {
    switch (error.severity) {
      case 'critical':
        return 'text-red-600';
      case 'high':
        return 'text-orange-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const getIcon = () => {
    switch (error.severity) {
      case 'critical':
        return <AlertTriangle size={20} className={getIconColor()} />;
      case 'high':
        return <AlertCircle size={20} className={getIconColor()} />;
      case 'medium':
        return <Info size={20} className={getIconColor()} />;
      case 'low':
        return <CheckCircle size={20} className={getIconColor()} />;
      default:
        return <Info size={20} className={getIconColor()} />;
    }
  };

  return (
    <Animated.View
      entering={position === 'top' ? FadeInUp.delay(index * 100) : SlideInRight.delay(index * 100)}
      exiting={position === 'top' ? FadeOutUp : SlideOutRight}
    >
      <Card className={`${getBackgroundColor()} shadow-lg`}>
        <CardContent className="p-4">
          <View className="flex-row items-start">
            {/* Icon */}
            <View className="mr-3 mt-0.5">
              {getIcon()}
            </View>

            {/* Content */}
            <View className="flex-1">
              <Text className="font-semibold text-sm mb-1">
                {title}
              </Text>
              <Text className="text-sm text-muted-foreground mb-3">
                {message}
              </Text>

              {/* Actions */}
              {actions && actions.length > 0 && (
                <View className="flex-row gap-2">
                  {actions.map((action: { label: string; action: () => void; style?: 'default' | 'destructive' | 'cancel' }, actionIndex: number) => (
                    <Button
                      key={actionIndex}
                      variant={action.style === 'destructive' ? 'destructive' : 'outline'}
                      size="sm"
                      onPress={() => {
                        action.action();
                        if (action.style !== 'cancel') {
                          onDismiss();
                        }
                      }}
                    >
                      <Text className="text-xs">{action.label}</Text>
                    </Button>
                  ))}
                </View>
              )}
            </View>

            {/* Dismiss Button */}
            <Pressable
              onPress={onDismiss}
              className="ml-2 p-1 rounded-full hover:bg-black/5 active:bg-black/10"
            >
              <X size={16} className="text-muted-foreground" />
            </Pressable>
          </View>

          {/* Progress Bar */}
          {autoHide && duration && (
            <View className="mt-3 h-1 bg-black/10 rounded-full overflow-hidden">
              <Animated.View
                style={[progressStyle]}
                className={`h-full ${
                  error.severity === 'critical' ? 'bg-red-500' :
                  error.severity === 'high' ? 'bg-orange-500' :
                  error.severity === 'medium' ? 'bg-yellow-500' :
                  'bg-blue-500'
                }`}
              />
            </View>
          )}
        </CardContent>
      </Card>
    </Animated.View>
  );
}

/**
 * Hook for programmatic notifications
 */
export function useNotifications() {
  const showSuccess = (message: string, options?: {
    title?: string;
    duration?: number;
    action?: { label: string; onPress: () => void };
  }) => {
    toast.success(options?.title || 'Success', {
      description: message,
      duration: options?.duration || 5000,
      action: options?.action ? {
        label: options.action.label,
        onClick: options.action.onPress,
      } : undefined,
    });
  };

  const showError = (message: string, options?: {
    title?: string;
    duration?: number;
    action?: { label: string; onPress: () => void };
  }) => {
    toast.error(options?.title || 'Error', {
      description: message,
      duration: options?.duration || 5000,
      action: options?.action ? {
        label: options.action.label,
        onClick: options.action.onPress,
      } : undefined,
    });
  };

  const showWarning = (message: string, options?: {
    title?: string;
    duration?: number;
    action?: { label: string; onPress: () => void };
  }) => {
    toast.warning(options?.title || 'Warning', {
      description: message,
      duration: options?.duration || 5000,
      action: options?.action ? {
        label: options.action.label,
        onClick: options.action.onPress,
      } : undefined,
    });
  };

  const showInfo = (message: string, options?: {
    title?: string;
    duration?: number;
    action?: { label: string; onPress: () => void };
  }) => {
    toast.info(options?.title || 'Info', {
      description: message,
      duration: options?.duration || 5000,
      action: options?.action ? {
        label: options.action.label,
        onClick: options.action.onPress,
      } : undefined,
    });
  };

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
}

// Helper function to get notification icon
function getNotificationIcon(severity: string) {
  switch (severity) {
    case 'critical':
      return '🚨';
    case 'high':
      return '⚠️';
    case 'medium':
      return 'ℹ️';
    case 'low':
      return '✅';
    default:
      return 'ℹ️';
  }
}
