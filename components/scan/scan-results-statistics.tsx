import React, { useMemo } from "react";
import { View, ScrollView, useWindowDimensions, Pressable } from "react-native";
import { Label } from "~/components/ui/label";
import {
  BarChartIcon,
  AlertCircle,
  Lock,
  CheckCircle2,
  Network,
  Gauge,
  Wifi,
  ServerCog,
} from "lucide-react-native";
import Animated, {
  FadeIn,
  FadeOut,
  Layout,
  useAnimatedStyle,
  withSpring,
  withTiming,
  useSharedValue,
  interpolate,
  Easing,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Button } from "~/components/ui/button";
import { Progress } from "~/components/ui/progress";
import { useColorScheme } from "nativewind";
import { Badge } from "~/components/ui/badge";
import { Text } from "~/components/ui/text";
import { PieChart, BarChart } from "react-native-chart-kit";

// 定义扫描结果项类型
interface ScanResult {
  port: number;
  status: "open" | "closed" | "error" | "filtered";
  service?: string;
  latency?: number;
  protocol?: "tcp" | "udp";
}

interface StatisticsProps {
  results: ScanResult[];
  ipAddress?: string;
  isLoading?: boolean;
  className?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  scanSpeed?: number;
  scanTime?: number; // 扫描用时，秒
  onExport?: () => void;
}

// 服务分类器
const categorizeService = (service?: string): string => {
  if (!service) return "未知";

  const categories: Record<string, RegExp[]> = {
    Web: [/http|www|web|nginx|apache/i],
    数据库: [/sql|db|mongo|redis|postgres|mysql/i],
    文件: [/ftp|sftp|samba|nfs/i],
    远程: [/ssh|telnet|rdp|vnc/i],
    邮件: [/smtp|pop|imap|mail/i],
    DNS: [/dns|domain/i],
    流媒体: [/rtsp|rtmp|stream/i],
    安全: [/ssl|tls|ipsec|vpn/i],
  };

  for (const [category, patterns] of Object.entries(categories)) {
    if (patterns.some((pattern) => pattern.test(service))) {
      return category;
    }
  }

  return "其他";
};

const ScanResultsStatistics: React.FC<StatisticsProps> = ({
  results,
  ipAddress,
  isLoading,
  className,
  collapsible,
  defaultCollapsed,
  scanSpeed,
  scanTime,
  onExport,
}) => {
  const { colorScheme } = useColorScheme();
  const { width } = useWindowDimensions();
  const chartWidth = width - 40; // 减去左右内边距

  // 统计数据计算
  const stats = useMemo(() => {
    const openCount = results.filter((r) => r.status === "open").length;
    const closedCount = results.filter((r) => r.status === "closed").length;
    const errorCount = results.filter((r) => r.status === "error").length;
    const filteredCount = results.filter((r) => r.status === "filtered").length;

    const totalPorts = results.length;
    const openPercentage = totalPorts > 0 ? (openCount / totalPorts) * 100 : 0;

    // 端口状态饼图数据
    const statusPieData = [
      { name: "开放", count: openCount, color: "#10B981" },
      { name: "关闭", count: closedCount, color: "#6B7280" },
      { name: "过滤", count: filteredCount, color: "#F59E0B" },
      { name: "错误", count: errorCount, color: "#EF4444" },
    ].filter((item) => item.count > 0);

    // 按服务类型分组
    const serviceGroups: Record<string, number> = {};
    results
      .filter((r) => r.status === "open" && r.service)
      .forEach((r) => {
        const category = categorizeService(r.service);
        serviceGroups[category] = (serviceGroups[category] || 0) + 1;
      });

    const colors = [
      "#FF6384",
      "#36A2EB",
      "#FFCE56",
      "#4BC0C0",
      "#9966FF",
      "#FF9F40",
      "#8AC249",
      "#EA526F",
    ];
    const serviceData = Object.entries(serviceGroups)
      .map(([name, value], index) => ({
        name,
        count: value,
        color: colors[index % colors.length],
      }))
      .filter((item) => item.count > 0);

    // 端口分布柱状图
    const portDistribution: Record<string, number> = {};
    results.forEach((r) => {
      let range = "0-1023";
      if (r.port >= 1024 && r.port <= 49151) range = "1024-49151";
      if (r.port >= 49152) range = "49152+";
      portDistribution[range] = (portDistribution[range] || 0) + 1;
    });

    const portDistLabels = [
      "系统端口\n(0-1023)",
      "用户端口\n(1024-49151)",
      "动态端口\n(49152+)",
    ];
    const portDistData = [
      portDistribution["0-1023"] || 0,
      portDistribution["1024-49151"] || 0,
      portDistribution["49152+"] || 0,
    ];

    return {
      openCount,
      closedCount,
      errorCount,
      filteredCount,
      totalPorts,
      openPercentage,
      statusPieData,
      serviceData,
      portDistLabels,
      portDistData,
    };
  }, [results]);

  // 图表配置
  const chartConfig = {
    backgroundGradientFrom: colorScheme === "dark" ? "#18181b" : "#ffffff",
    backgroundGradientTo: colorScheme === "dark" ? "#18181b" : "#ffffff",
    decimalPlaces: 0,
    color: (opacity = 1) =>
      colorScheme === "dark"
        ? `rgba(255, 255, 255, ${opacity})`
        : `rgba(0, 0, 0, ${opacity})`,
    labelColor: (opacity = 1) =>
      colorScheme === "dark"
        ? `rgba(255, 255, 255, ${opacity})`
        : `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForLabels: {
      fontSize: 12,
    },
  };

  // 如果没有结果，显示空状态
  if (results.length === 0) {
    return (
      <Text className="text-center py-4 text-muted-foreground">
        暂无扫描结果统计数据
      </Text>
    );
  }

  return (
    <React.Fragment>
      <Text className="text-lg font-medium mb-4">扫描结果统计</Text>

      <Text className="text-base font-medium mb-2">端口状态分布</Text>
      {stats.statusPieData.length > 0 && (
        <View className="items-center mb-4">
          <PieChart
            data={stats.statusPieData.map((item) => ({
              name: item.name,
              population: item.count,
              color: item.color,
              legendFontColor: colorScheme === "dark" ? "#fff" : "#000",
              legendFontSize: 12,
            }))}
            width={chartWidth}
            height={180}
            chartConfig={chartConfig}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
          />
        </View>
      )}

      <Text className="text-base font-medium mb-2 mt-6">服务类型分布</Text>
      {stats.serviceData.length > 0 ? (
        <View className="items-center mb-4">
          <PieChart
            data={stats.serviceData.map((item) => ({
              name: item.name,
              population: item.count,
              color: item.color,
              legendFontColor: colorScheme === "dark" ? "#fff" : "#000",
              legendFontSize: 12,
            }))}
            width={chartWidth}
            height={180}
            chartConfig={chartConfig}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
          />
        </View>
      ) : (
        <Text className="text-sm text-muted-foreground mb-4">
          无服务类型数据
        </Text>
      )}

      <Text className="text-base font-medium mb-2 mt-6">端口范围分布</Text>
      <View className="items-center mb-4">
        <BarChart
          data={{
            labels: stats.portDistLabels,
            datasets: [
              {
                data: stats.portDistData,
              },
            ],
          }}
          width={chartWidth}
          height={200}
          yAxisLabel=""
          yAxisSuffix=""
          chartConfig={{
            ...chartConfig,
            barPercentage: 0.5,
            color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
          }}
          style={{
            marginVertical: 8,
            borderRadius: 16,
          }}
        />
      </View>

      <Text className="text-sm text-muted-foreground mt-4">
        共扫描 {stats.totalPorts} 个端口，发现 {stats.openCount} 个开放端口 (
        {stats.openPercentage.toFixed(1)}%)
      </Text>
    </React.Fragment>
  );
};

export default ScanResultsStatistics;
