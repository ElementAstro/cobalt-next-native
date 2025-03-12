import React, { useState, useCallback, useMemo, useEffect } from "react";
import { View, Pressable } from "react-native";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Search,
  Filter,
  X,
  Check,
  ChevronDown,
  SortAsc,
  SortDesc,
} from "lucide-react-native";
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
  useSharedValue,
  interpolateColor,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { toast } from "sonner-native";
import { useColorScheme } from "nativewind";
import { useDebouncedCallback } from "use-debounce";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "~/components/ui/tooltip";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";

export interface FilterOptions {
  status: string | null;
  serviceType: string | null;
  portRange: [number, number] | null;
  sortBy: "port" | "status" | "service" | "latency";
  sortDirection: "asc" | "desc";
}

interface ScanFilterBarProps {
  onFilterChange: (filter: FilterOptions) => void;
  onSearchChange: (search: string) => void;
  filterOptions?: FilterOptions;
  placeholder?: string;
  showFilters?: boolean;
  isLoading?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const ScanFilterBar: React.FC<ScanFilterBarProps> = ({
  onFilterChange,
  onSearchChange,
  filterOptions = {
    status: null,
    serviceType: null,
    portRange: null,
    sortBy: "port",
    sortDirection: "asc",
  },
  placeholder = "按端口、服务名称搜索",
  showFilters = true,
  isLoading = false,
}) => {
  const [search, setSearch] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>(filterOptions);
  const expandAnim = useSharedValue(0);
  const filtersApplied = useSharedValue(0);
  const { colorScheme } = useColorScheme();

  // 计算是否有活跃过滤器
  const hasActiveFilters = useMemo(() => {
    return (
      filters.status !== null ||
      filters.serviceType !== null ||
      filters.portRange !== null ||
      filters.sortBy !== "port" ||
      filters.sortDirection !== "asc"
    );
  }, [filters]);

  // 更新过滤器应用动画
  useEffect(() => {
    filtersApplied.value = withSpring(hasActiveFilters ? 1 : 0);
  }, [hasActiveFilters, filtersApplied]);

  const debouncedSearch = useDebouncedCallback((value) => {
    onSearchChange(value);
  }, 300);

  const handleSearchChange = useCallback(
    (text: string) => {
      setSearch(text);
      debouncedSearch(text);
    },
    [debouncedSearch]
  );

  const clearSearch = useCallback(() => {
    setSearch("");
    onSearchChange("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [onSearchChange]);

  const toggleExpand = useCallback(() => {
    setIsExpanded(!isExpanded);
    expandAnim.value = withTiming(isExpanded ? 0 : 1, {
      duration: 300,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [isExpanded, expandAnim]);

  const updateFilter = useCallback(
    (key: keyof FilterOptions, value: any) => {
      const newFilters = { ...filters, [key]: value } as FilterOptions;
      setFilters(newFilters);
      onFilterChange(newFilters);
      Haptics.selectionAsync();
    },
    [filters, onFilterChange]
  );

  const handleSortDirectionToggle = useCallback(() => {
    updateFilter(
      "sortDirection",
      filters.sortDirection === "asc" ? "desc" : "asc"
    );
  }, [filters.sortDirection, updateFilter]);

  const resetFilters = useCallback(() => {
    const defaultFilters: FilterOptions = {
      status: null,
      serviceType: null,
      portRange: null,
      sortBy: "port",
      sortDirection: "asc",
    };
    setFilters(defaultFilters);
    onFilterChange(defaultFilters);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    toast.success("已重置所有筛选条件", { duration: 2000 });
  }, [onFilterChange]);

  const filterContainerStyle = useAnimatedStyle(() => ({
    height: withTiming(isExpanded ? 120 : 0, {
      duration: 300,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    }),
    opacity: expandAnim.value,
  }));

  const filterButtonStyle = useAnimatedStyle(() => ({
    backgroundColor: withTiming(
      hasActiveFilters
        ? "hsla(var(--primary) / 0.2)"
        : "hsla(var(--muted) / 0.4)",
      { duration: 200 }
    ),
    borderColor: withTiming(
      hasActiveFilters ? "hsla(var(--primary) / 0.5)" : "hsla(var(--border))",
      { duration: 200 }
    ),
  }));

  const iconRotationStyle = useAnimatedStyle(() => ({
    transform: [
      {
        rotate: `${expandAnim.value * 180}deg`,
      },
    ],
  }));

  const statusOptions = [
    { value: null, label: "所有状态" },
    { value: "open", label: "开放" },
    { value: "closed", label: "关闭" },
    { value: "filtered", label: "过滤" },
    { value: "error", label: "错误" },
  ];

  const serviceOptions = [
    { value: null, label: "所有服务" },
    { value: "http", label: "HTTP/Web" },
    { value: "ssh", label: "SSH/远程" },
    { value: "db", label: "数据库" },
    { value: "dns", label: "DNS/网络" },
  ];

  const sortByOptions = [
    { value: "port", label: "端口号" },
    { value: "status", label: "状态" },
    { value: "service", label: "服务名称" },
    { value: "latency", label: "延迟" },
  ];

  // 创建自定义搜索框，因为 Input 不支持 leftIcon 和 rightIcon
  const SearchBox = () => (
    <View className="relative">
      <Input
        placeholder={isLoading ? "扫描中..." : placeholder}
        value={search}
        onChangeText={handleSearchChange}
        className="rounded-full bg-muted/20 border-border/30 pl-10 pr-10"
        editable={!isLoading}
      />
      <View className="absolute left-3 top-2.5">
        <Search size={16} className="text-muted-foreground" />
      </View>
      {search ? (
        <Pressable className="absolute right-3 top-2.5" onPress={clearSearch}>
          <X size={16} className="text-muted-foreground" />
        </Pressable>
      ) : null}
    </View>
  );

  // 使用 Tooltip 代替 Menu
  const FilterOption = ({
    title,
    options,
    currentValue,
    onSelect,
  }: {
    title: string;
    options: Array<{ value: any; label: string }>;
    currentValue: any;
    onSelect: (value: any) => void;
  }) => (
    <Tooltip>
      <TooltipTrigger>
        <Button
          variant="outline"
          size="sm"
          className={`
            h-9 px-3 rounded-full
            ${currentValue !== null ? "bg-primary/10 border-primary/30" : ""}
          `}
        >
          <Label className="text-xs mr-1">{title}:</Label>
          <Label
            className={`text-xs ${currentValue !== null ? "text-primary" : ""}`}
          >
            {options.find((o) => o.value === currentValue)?.label || "未选择"}
          </Label>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <View className="py-1">
          <Text className="font-medium mb-2">{title}选项</Text>
          <View className="space-y-1">
            {options.map((option) => (
              <Button
                key={String(option.value)}
                variant={currentValue === option.value ? "default" : "ghost"}
                size="sm"
                onPress={() => onSelect(option.value)}
                className="justify-between"
              >
                <Text>{option.label}</Text>
                {currentValue === option.value && (
                  <Check size={16} className="ml-2" />
                )}
              </Button>
            ))}
          </View>
        </View>
      </TooltipContent>
    </Tooltip>
  );

  return (
    <Animated.View className="px-4 py-2 space-y-3">
      {/* 搜索栏 */}
      <View className="flex-row items-center space-x-3">
        <Animated.View className="flex-1">
          <SearchBox />
        </Animated.View>

        {/* 排序方向按钮 */}
        <AnimatedPressable
          onPress={handleSortDirectionToggle}
          className="bg-muted/20 w-10 h-10 rounded-full items-center justify-center border border-border/30"
        >
          {filters.sortDirection === "asc" ? (
            <SortAsc
              size={18}
              className={
                filters.sortDirection !== "asc"
                  ? "text-primary"
                  : "text-muted-foreground"
              }
            />
          ) : (
            <SortDesc
              size={18}
              className={
                filters.sortDirection !== "desc"
                  ? "text-primary"
                  : "text-muted-foreground"
              }
            />
          )}
        </AnimatedPressable>

        {/* 过滤器按钮 */}
        {showFilters && (
          <AnimatedPressable
            style={filterButtonStyle}
            onPress={toggleExpand}
            className="bg-muted/20 px-3 h-10 rounded-full flex-row items-center justify-center border border-border/30"
          >
            <Filter
              size={18}
              className={
                hasActiveFilters ? "text-primary" : "text-muted-foreground"
              }
            />
            <Animated.View style={iconRotationStyle}>
              <ChevronDown
                size={18}
                className={
                  hasActiveFilters
                    ? "text-primary ml-1"
                    : "text-muted-foreground ml-1"
                }
              />
            </Animated.View>
          </AnimatedPressable>
        )}
      </View>

      {/* 展开的过滤器面板 */}
      {showFilters && (
        <Animated.View style={filterContainerStyle} className="overflow-hidden">
          <View className="bg-card/70 backdrop-blur-lg p-4 rounded-xl border border-border/30 space-y-3">
            {/* 过滤器选项行 */}
            <View className="flex-row justify-between items-center flex-wrap gap-2">
              {/* 状态过滤器 */}
              <FilterOption
                title="状态"
                options={statusOptions}
                currentValue={filters.status}
                onSelect={(value) => updateFilter("status", value)}
              />

              {/* 服务类型过滤器 */}
              <FilterOption
                title="服务"
                options={serviceOptions}
                currentValue={filters.serviceType}
                onSelect={(value) => updateFilter("serviceType", value)}
              />

              {/* 排序依据过滤器 */}
              <FilterOption
                title="排序"
                options={sortByOptions}
                currentValue={filters.sortBy}
                onSelect={(value) => updateFilter("sortBy", value)}
              />
            </View>

            {/* 重置按钮 */}
            <View className="flex-row justify-end">
              <Button
                variant="ghost"
                size="sm"
                onPress={resetFilters}
                className={`
                  rounded-full px-3 py-1
                  ${
                    hasActiveFilters
                      ? "text-primary border-primary/20"
                      : "text-muted-foreground"
                  }
                `}
              >
                <Label className="text-xs">重置过滤器</Label>
              </Button>
            </View>
          </View>
        </Animated.View>
      )}
    </Animated.View>
  );
};

export default React.memo(ScanFilterBar);
