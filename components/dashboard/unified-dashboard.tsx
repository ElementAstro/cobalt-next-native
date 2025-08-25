/**
 * Unified dashboard providing central overview of all app features
 * Shows system status, quick actions, and feature summaries
 */

import React, { useState } from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import Animated, { FadeInUp, SlideInRight } from 'react-native-reanimated';
import { 
  Activity, 
  Download, 
  Search, 
  Settings, 
  Zap, 
  Wifi, 
  WifiOff,
  Play,
  Pause,
  Plus,
  BarChart3,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react-native';
import { Text } from '~/components/ui/text';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { EnhancedButton } from '~/components/ui/enhanced-button';
import { Progress } from '~/components/ui/progress';
import { Badge } from '~/components/ui/badge';
import { useDashboardData, useAppStatus } from '~/lib/services/service-provider';
import { useRouter } from 'expo-router';

interface DashboardProps {
  onQuickAction?: (action: string) => void;
}

export function UnifiedDashboard({ onQuickAction }: DashboardProps) {
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  
  const dashboardData = useDashboardData();
  const appStatus = useAppStatus();

  const onRefresh = async () => {
    setRefreshing(true);
    // Simulate refresh delay
    setTimeout(() => setRefreshing(false), 1000);
  };

  if (!dashboardData || !appStatus) {
    return (
      <View className="flex-1 bg-background p-4">
        <Text className="text-center text-muted-foreground">Loading dashboard...</Text>
      </View>
    );
  }

  const { downloads, scans, performance, quickActions } = dashboardData;

  return (
    <ScrollView 
      className="flex-1 bg-background"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      showsVerticalScrollIndicator={false}
    >
      <View className="p-4 space-y-6">
        
        {/* Header */}
        <Animated.View entering={FadeInUp.delay(100)}>
          <View className="flex-row items-center justify-between mb-2">
            <View>
              <Text className="text-2xl font-bold">Dashboard</Text>
              <Text className="text-muted-foreground">System overview and quick actions</Text>
            </View>
            <View className="flex-row items-center">
              {appStatus.isHealthy ? (
                <View className="flex-row items-center">
                  <View className="w-2 h-2 rounded-full bg-green-500 mr-2" />
                  <Text className="text-sm text-green-600">Healthy</Text>
                </View>
              ) : (
                <View className="flex-row items-center">
                  <View className="w-2 h-2 rounded-full bg-red-500 mr-2" />
                  <Text className="text-sm text-red-600">Issues</Text>
                </View>
              )}
            </View>
          </View>
        </Animated.View>

        {/* System Status Cards */}
        <Animated.View entering={FadeInUp.delay(200)}>
          <View className="flex-row gap-3">
            <SystemStatusCard
              title="Network"
              value={appStatus.features.downloadsActive > 0 ? "Active" : "Idle"}
              icon={appStatus.isHealthy ? <Wifi size={20} className="text-green-500" /> : <WifiOff size={20} className="text-red-500" />}
              trend={appStatus.features.totalOperations}
              className="flex-1"
            />
            <SystemStatusCard
              title="Performance"
              value={`${Math.round(performance.cpuUsage || 0)}%`}
              icon={<Zap size={20} className="text-blue-500" />}
              trend={performance.memoryUsage || 0}
              className="flex-1"
            />
          </View>
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View entering={FadeInUp.delay(300)}>
          <Card>
            <CardHeader>
              <CardTitle className="flex-row items-center">
                <Activity size={20} className="mr-2" />
                Quick Actions
              </CardTitle>
              <CardDescription>Common tasks and shortcuts</CardDescription>
            </CardHeader>
            <CardContent>
              <View className="flex-row flex-wrap gap-2">
                <QuickActionButton
                  icon={<Download size={16} />}
                  label="New Download"
                  onPress={() => {
                    onQuickAction?.('new-download');
                    router.push('/download');
                  }}
                />
                <QuickActionButton
                  icon={<Search size={16} />}
                  label="Quick Scan"
                  onPress={() => {
                    onQuickAction?.('quick-scan');
                    // Would open quick scan modal
                  }}
                />
                <QuickActionButton
                  icon={<Settings size={16} />}
                  label="Settings"
                  onPress={() => {
                    onQuickAction?.('settings');
                    // Would open settings modal
                  }}
                />
                {downloads.stats.paused > 0 && (
                  <QuickActionButton
                    icon={<Play size={16} />}
                    label="Resume All"
                    onPress={() => onQuickAction?.('resume-all')}
                  />
                )}
              </View>
            </CardContent>
          </Card>
        </Animated.View>

        {/* Downloads Overview */}
        <Animated.View entering={SlideInRight.delay(400)}>
          <Card>
            <CardHeader>
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Download size={20} className="mr-2" />
                  <CardTitle>Downloads</CardTitle>
                </View>
                <Button
                  variant="ghost"
                  size="sm"
                  onPress={() => router.push('/download')}
                >
                  <Text>View All</Text>
                </Button>
              </View>
            </CardHeader>
            <CardContent>
              <View className="space-y-4">
                {/* Download Stats */}
                <View className="flex-row justify-between">
                  <StatItem
                    label="Active"
                    value={downloads.stats.active}
                    icon={<Activity size={16} className="text-blue-500" />}
                  />
                  <StatItem
                    label="Completed"
                    value={downloads.stats.completed}
                    icon={<CheckCircle size={16} className="text-green-500" />}
                  />
                  <StatItem
                    label="Paused"
                    value={downloads.stats.paused}
                    icon={<Pause size={16} className="text-orange-500" />}
                  />
                  <StatItem
                    label="Errors"
                    value={downloads.stats.error}
                    icon={<AlertCircle size={16} className="text-red-500" />}
                  />
                </View>

                {/* Overall Progress */}
                {downloads.stats.active > 0 && (
                  <View>
                    <View className="flex-row justify-between items-center mb-2">
                      <Text className="text-sm text-muted-foreground">Overall Progress</Text>
                      <Text className="text-sm font-medium">
                        {Math.round(downloads.stats.totalProgress * 100)}%
                      </Text>
                    </View>
                    <Progress value={downloads.stats.totalProgress * 100} className="h-2" />
                  </View>
                )}

                {/* Recent Downloads */}
                {downloads.recentDownloads.length > 0 && (
                  <View>
                    <Text className="text-sm font-medium mb-2">Recent Downloads</Text>
                    <View className="space-y-2">
                      {downloads.recentDownloads.slice(0, 3).map((download: any) => (
                        <View key={download.id} className="flex-row items-center justify-between p-2 bg-muted/20 rounded">
                          <Text className="text-sm flex-1" numberOfLines={1}>
                            {download.filename}
                          </Text>
                          <Badge variant={download.status === 'completed' ? 'default' : 'secondary'}>
                            {download.status}
                          </Badge>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            </CardContent>
          </Card>
        </Animated.View>

        {/* Scanner Overview */}
        <Animated.View entering={SlideInRight.delay(500)}>
          <Card>
            <CardHeader>
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Search size={20} className="mr-2" />
                  <CardTitle>Network Scanner</CardTitle>
                </View>
                <Button
                  variant="ghost"
                  size="sm"
                  onPress={() => {
                    // Would navigate to scanner screen
                  }}
                >
                  <Text>View All</Text>
                </Button>
              </View>
            </CardHeader>
            <CardContent>
              <View className="space-y-4">
                {/* Scanner Stats */}
                <View className="flex-row justify-between">
                  <StatItem
                    label="Active Scans"
                    value={scans.activeSessions.length}
                    icon={<Activity size={16} className="text-blue-500" />}
                  />
                  <StatItem
                    label="Total Scans"
                    value={scans.totalScans}
                    icon={<BarChart3 size={16} className="text-purple-500" />}
                  />
                  <StatItem
                    label="Open Ports"
                    value={scans.openPorts}
                    icon={<CheckCircle size={16} className="text-green-500" />}
                  />
                  <StatItem
                    label="Success Rate"
                    value={`${Math.round(scans.successRate * 100)}%`}
                    icon={<Clock size={16} className="text-orange-500" />}
                  />
                </View>

                {/* Recent Scans */}
                {scans.recentSessions.length > 0 && (
                  <View>
                    <Text className="text-sm font-medium mb-2">Recent Scans</Text>
                    <View className="space-y-2">
                      {scans.recentSessions.slice(0, 3).map((session: any) => (
                        <View key={session.id} className="flex-row items-center justify-between p-2 bg-muted/20 rounded">
                          <Text className="text-sm flex-1" numberOfLines={1}>
                            {session.target}
                          </Text>
                          <Text className="text-xs text-muted-foreground">
                            {session.openPorts} open
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            </CardContent>
          </Card>
        </Animated.View>

        {/* Performance Metrics */}
        <Animated.View entering={FadeInUp.delay(600)}>
          <Card>
            <CardHeader>
              <CardTitle className="flex-row items-center">
                <Zap size={20} className="mr-2" />
                Performance
              </CardTitle>
              <CardDescription>System performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <View className="space-y-3">
                <MetricRow
                  label="Memory Usage"
                  value={`${Math.round(performance.memoryUsage || 0)} MB`}
                  progress={(performance.memoryUsage || 0) / 1000}
                />
                <MetricRow
                  label="CPU Usage"
                  value={`${Math.round(performance.cpuUsage || 0)}%`}
                  progress={(performance.cpuUsage || 0) / 100}
                />
                <MetricRow
                  label="Network Latency"
                  value={`${Math.round(performance.networkLatency || 0)}ms`}
                  progress={(performance.networkLatency || 0) / 1000}
                />
              </View>
            </CardContent>
          </Card>
        </Animated.View>

      </View>
    </ScrollView>
  );
}

// Helper Components
function SystemStatusCard({ 
  title, 
  value, 
  icon, 
  trend, 
  className 
}: { 
  title: string; 
  value: string; 
  icon: React.ReactNode; 
  trend: number;
  className?: string;
}) {
  return (
    <Card className={className || ''}>
      <CardContent className="p-4">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-sm text-muted-foreground">{title}</Text>
            <Text className="text-lg font-semibold">{value}</Text>
          </View>
          {icon}
        </View>
        <Text className="text-xs text-muted-foreground mt-1">
          {trend} operations
        </Text>
      </CardContent>
    </Card>
  );
}

function QuickActionButton({ 
  icon, 
  label, 
  onPress 
}: { 
  icon: React.ReactNode; 
  label: string; 
  onPress: () => void;
}) {
  return (
    <EnhancedButton
      variant="outline"
      size="sm"
      onPress={onPress}
      leftIcon={icon}
      className="flex-row items-center"
    >
      {label}
    </EnhancedButton>
  );
}

function StatItem({ 
  label, 
  value, 
  icon 
}: { 
  label: string; 
  value: number | string; 
  icon: React.ReactNode;
}) {
  return (
    <View className="items-center">
      <View className="flex-row items-center mb-1">
        {icon}
        <Text className="text-xs text-muted-foreground ml-1">{label}</Text>
      </View>
      <Text className="text-lg font-semibold">{value}</Text>
    </View>
  );
}

function MetricRow({ 
  label, 
  value, 
  progress 
}: { 
  label: string; 
  value: string; 
  progress: number;
}) {
  return (
    <View>
      <View className="flex-row justify-between items-center mb-1">
        <Text className="text-sm text-muted-foreground">{label}</Text>
        <Text className="text-sm font-medium">{value}</Text>
      </View>
      <Progress value={Math.min(progress * 100, 100)} className="h-1" />
    </View>
  );
}
