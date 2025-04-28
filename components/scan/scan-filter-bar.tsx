import React, {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from "react";
import { View, Pressable, AccessibilityInfo, Keyboard } from "react-native";
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
  AlertCircle,
  Trash2,
  RotateCcw,
  FilterX,
  ChevronsUpDown,
  Loader2,
  Tag,
  Server,
} from "lucide-react-native";
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
  useSharedValue,
  interpolateColor,
  FadeIn,
  FadeOut,
  ZoomIn,
  ZoomOut,
  SlideInUp,
  SlideInRight,
  SlideOutDown,
  Layout,
  SlideInDown,
  withSequence,
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
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";

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
  resultsCount?: number;
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
  resultsCount,
}) => {
  const [search, setSearch] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>(filterOptions);
  const [screenReaderEnabled, setScreenReaderEnabled] = useState(false);
  const [activeFilterCount, setActiveFilterCount] = useState(0);
  const searchInputRef = useRef<any>(null);

  const expandAnim = useSharedValue(0);
  const filtersApplied = useSharedValue(0);
  const searchFocused = useSharedValue(0);
  const resetButtonScale = useSharedValue(1);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  // 检查屏幕阅读器状态
  useEffect(() => {
    AccessibilityInfo.isScreenReaderEnabled().then(setScreenReaderEnabled);
    const subscription = AccessibilityInfo.addEventListener(
      "screenReaderChanged",
      setScreenReaderEnabled
    );
    return () => subscription.remove();
  }, []);

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

  // 计算活跃过滤器数量
  useEffect(() => {
    let count = 0;
    if (filters.status !== null) count++;
    if (filters.serviceType !== null) count++;
    if (filters.portRange !== null) count++;
    if (filters.sortBy !== "port") count++;
    if (filters.sortDirection !== "asc") count++;

    setActiveFilterCount(count);
  }, [filters]);

  // 更新过滤器应用动画
  useEffect(() => {
    filtersApplied.value = withSpring(hasActiveFilters ? 1 : 0, {
      damping: 14,
      stiffness: 120,
    });
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

  const handleSearchFocus = useCallback(() => {
    searchFocused.value = withTiming(1, { duration: 200 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [searchFocused]);

  const handleSearchBlur = useCallback(() => {
    searchFocused.value = withTiming(0, { duration: 200 });
  }, [searchFocused]);

  const clearSearch = useCallback(() => {
    setSearch("");
    onSearchChange("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // 聚焦搜索框
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [onSearchChange]);

  const toggleExpand = useCallback(() => {
    setIsExpanded(!isExpanded);
    expandAnim.value = withTiming(isExpanded ? 0 : 1, {
      duration: 300,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // 收起键盘
    Keyboard.dismiss();
  }, [isExpanded, expandAnim]);

  const updateFilter = useCallback(
    (key: keyof FilterOptions, value: any) => {
      const newFilters = { ...filters, [key]: value } as FilterOptions;
      setFilters(newFilters);
      onFilterChange(newFilters);
      Haptics.selectionAsync();

      // 显示过滤器已应用的提示
      const filterName =
        key === "status"
          ? "状态"
          : key === "serviceType"
          ? "服务类型"
          : key === "portRange"
          ? "端口范围"
          : key === "sortBy"
          ? "排序方式"
          : "排序方向";

      const filterValueText =
        value === null
          ? "已重置"
          : key === "status" && value === "open"
          ? "开放"
          : key === "status" && value === "closed"
          ? "关闭"
          : key === "status" && value === "filtered"
          ? "过滤"
          : key === "status" && value === "error"
          ? "错误"
          : key === "sortBy" && value === "port"
          ? "端口号"
          : key === "sortBy" && value === "status"
          ? "状态"
          : key === "sortBy" && value === "service"
          ? "服务名称"
          : key === "sortBy" && value === "latency"
          ? "延迟"
          : key === "sortDirection" && value === "asc"
          ? "升序"
          : key === "sortDirection" && value === "desc"
          ? "降序"
          : String(value);

      toast.success(`已更新${filterName}过滤器`, {
        description: `${filterName}: ${filterValueText}`,
        duration: 2000,
        icon: <Filter size={16} />,
      });
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
    resetButtonScale.value = withSequence(
      withTiming(0.9, { duration: 100 }),
      withTiming(1.1, { duration: 100 }),
      withTiming(1, { duration: 100 })
    );

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
    toast.success("已重置所有筛选条件", {
      duration: 2000,
      icon: <RotateCcw size={16} />,
    });

    // 收起过滤器面板
    if (isExpanded) {
      setIsExpanded(false);
      expandAnim.value = withTiming(0, {
        duration: 300,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      });
    }
  }, [onFilterChange, resetButtonScale, isExpanded, expandAnim]);

  const filterContainerStyle = useAnimatedStyle(() => ({
    height: withTiming(isExpanded ? "auto" : 0, {
      duration: 300,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    }),
    opacity: expandAnim.value,
  }));

  const filterButtonStyle = useAnimatedStyle(() => ({
    backgroundColor: withTiming(
      hasActiveFilters
        ? isDark
          ? "hsla(var(--primary) / 0.25)"
          : "hsla(var(--primary) / 0.15)"
        : isDark
        ? "hsla(var(--muted) / 0.6)"
        : "hsla(var(--muted) / 0.4)",
      { duration: 200 }
    ),
    borderColor: withTiming(
      hasActiveFilters ? "hsla(var(--primary) / 0.5)" : "hsla(var(--border))",
      { duration: 200 }
    ),
    transform: [
      {
        scale: withSpring(activeFilterCount > 0 ? 1.05 : 1, {
          mass: 0.5,
          damping: 12,
        }),
      },
    ],
  }));

  const searchContainerStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      searchFocused.value,
      [0, 1],
      ["hsla(var(--border) / 0.8)", "hsla(var(--primary) / 0.5)"]
    ),
    borderWidth: withSpring(searchFocused.value ? 2 : 1, {
      mass: 0.5,
      damping: 12,
    }),
    backgroundColor: withTiming(
      searchFocused.value
        ? isDark
          ? "hsla(var(--card) / 0.7)"
          : "hsla(var(--card) / 0.9)"
        : isDark
        ? "hsla(var(--muted) / 0.4)"
        : "hsla(var(--muted) / 0.2)",
      { duration: 200 }
    ),
    transform: [
      {
        scale: withSpring(searchFocused.value ? 1.02 : 1, {
          mass: 0.5,
          damping: 12,
        }),
      },
    ],
  }));

  const iconRotationStyle = useAnimatedStyle(() => ({
    transform: [
      {
        rotate: `${expandAnim.value * 180}deg`,
      },
    ],
  }));

  const resetBtnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: resetButtonScale.value }],
    opacity: withTiming(hasActiveFilters ? 1 : 0, { duration: 200 }),
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

  // 创建自定义搜索框
  const SearchBox = () => (
    <Animated.View
      className="relative overflow-hidden rounded-full"
      style={searchContainerStyle}
    >
      <Input
        ref={searchInputRef}
        placeholder={isLoading ? "扫描中..." : placeholder}
        value={search}
        onChangeText={handleSearchChange}
        onFocus={handleSearchFocus}
        onBlur={handleSearchBlur}
        className="rounded-full bg-transparent border-0 pl-10 pr-10"
        editable={!isLoading}
        returnKeyType="search"
        accessibilityLabel="搜索端口和服务"
        accessibilityHint="输入关键词搜索扫描结果"
        accessible={screenReaderEnabled}
      />
      <View className="absolute left-3 top-2.5">
        {isLoading ? (
          <Loader2 size={16} className="text-muted-foreground animate-spin" />
        ) : (
          <Search size={16} className="text-muted-foreground" />
        )}
      </View>
      {search ? (
        <Pressable
          className="absolute right-3 top-2.5"
          onPress={clearSearch}
          accessibilityLabel="清除搜索"
          accessibilityRole="button"
        >
          <Animated.View entering={ZoomIn.duration(200)}>
            <X size={16} className="text-muted-foreground" />
          </Animated.View>
        </Pressable>
      ) : null}
    </Animated.View>
  );

  // 使用 Tooltip 代替 Menu
  const FilterOption = ({
    title,
    options,
    currentValue,
    onSelect,
    icon: IconComponent = Filter,
  }: {
    title: string;
    options: Array<{ value: any; label: string }>;
    currentValue: any;
    onSelect: (value: any) => void;
    icon?: React.ElementType;
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
          accessibilityLabel={`${title}过滤器: ${
            options.find((o) => o.value === currentValue)?.label || "未选择"
          }`}
          accessibilityHint="点击更改过滤选项"
        >
          <IconComponent
            className={`h-4 w-4 mr-1 ${
              currentValue !== null ? "text-primary" : "text-muted-foreground"
            }`}
          />
          <Label
            className={`text-xs ${currentValue !== null ? "text-primary" : ""}`}
          >
            {options.find((o) => o.value === currentValue)?.label || title}
          </Label>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <View className="py-1 w-52 max-w-full">
          <Text className="font-medium mb-2">{title}选项</Text>
          <View className="space-y-1">
            {options.map((option) => (
              <Button
                key={String(option.value)}
                variant={currentValue === option.value ? "default" : "ghost"}
                size="sm"
                onPress={() => onSelect(option.value)}
                className="justify-between"
                accessibilityState={{
                  selected: currentValue === option.value,
                }}
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

  // 显示过滤器标签
  const renderFilterTags = () => {
    if (!hasActiveFilters || !showFilters) return null;

    return (
      <Animated.View
        entering={SlideInDown.duration(300)}
        exiting={SlideOutDown.duration(200)}
        className="flex-row flex-wrap gap-1 px-1 mt-2"
      >
        {filters.status !== null && (
          <FilterTag
            label={
              statusOptions.find((o) => o.value === filters.status)?.label || ""
            }
            onPress={() => updateFilter("status", null)}
          />
        )}

        {filters.serviceType !== null && (
          <FilterTag
            label={
              serviceOptions.find((o) => o.value === filters.serviceType)
                ?.label || ""
            }
            onPress={() => updateFilter("serviceType", null)}
          />
        )}

        {filters.sortBy !== "port" && (
          <FilterTag
            label={`按${
              sortByOptions.find((o) => o.value === filters.sortBy)?.label || ""
            }排序`}
            onPress={() => updateFilter("sortBy", "port")}
          />
        )}

        {filters.sortDirection !== "asc" && (
          <FilterTag
            label="降序"
            onPress={() => updateFilter("sortDirection", "asc")}
          />
        )}

        <Animated.View style={resetBtnStyle}>
          <Button
            variant="outline"
            size="sm"
            onPress={resetFilters}
            className="h-6 rounded-full px-2 py-0 bg-background/50"
          >
            <Trash2 size={12} className="mr-1 text-muted-foreground" />
            <Text className="text-xs">重置</Text>
          </Button>
        </Animated.View>
      </Animated.View>
    );
  };

  // 过滤器标签组件
  const FilterTag = ({
    label,
    onPress,
  }: {
    label: string;
    onPress: () => void;
  }) => (
    <Animated.View entering={SlideInRight.duration(200)}>
      <Button
        variant="outline"
        size="sm"
        onPress={onPress}
        className="h-6 rounded-full px-2 py-0 bg-primary/10 border-primary/20"
      >
        <Text className="text-xs text-primary">{label}</Text>
        <X size={12} className="ml-1 text-primary" />
      </Button>
    </Animated.View>
  );

  // 结果计数组件
  const renderResultCount = () => {
    if (resultsCount === undefined) return null;

    return (
      <Animated.View
        entering={FadeIn.duration(300)}
        className="px-4 flex-row justify-between items-center pt-1"
      >
        <Text className="text-xs text-muted-foreground">
          {isLoading ? (
            <View className="flex-row items-center">
              <Loader2
                size={10}
                className="text-muted-foreground animate-spin mr-1"
              />
              <Text className="text-xs text-muted-foreground">正在搜索...</Text>
            </View>
          ) : resultsCount > 0 ? (
            `找到 ${resultsCount} 个结果`
          ) : search || hasActiveFilters ? (
            "没有找到匹配的结果"
          ) : (
            "暂无数据"
          )}
        </Text>

        {search && (
          <Button
            variant="ghost"
            size="sm"
            onPress={clearSearch}
            className="h-6 px-2 py-0"
          >
            <Text className="text-xs text-primary">清除搜索</Text>
          </Button>
        )}
      </Animated.View>
    );
  };

  return (
    <Animated.View layout={Layout} className="space-y-1">
      {/* 搜索栏 */}
      <View className="px-4 pt-2 pb-1 flex-row items-center space-x-3">
        <Animated.View className="flex-1" entering={FadeIn.duration(300)}>
          <SearchBox />
        </Animated.View>

        {/* 排序方向按钮 */}
        <AnimatedPressable
          onPress={handleSortDirectionToggle}
          className="bg-muted/20 dark:bg-muted/40 w-10 h-10 rounded-full items-center justify-center border border-border/30"
          accessibilityLabel={`排序方向：${
            filters.sortDirection === "asc" ? "升序" : "降序"
          }`}
          accessibilityRole="button"
          accessibilityHint="点击切换排序方向"
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
            className="px-3 h-10 rounded-full flex-row items-center justify-center border border-border/30"
            accessibilityLabel={`过滤器${
              activeFilterCount > 0 ? `：已应用${activeFilterCount}个` : ""
            }`}
            accessibilityRole="button"
            accessibilityHint="点击展开或收起过滤器选项"
          >
            <Filter
              size={18}
              className={
                hasActiveFilters ? "text-primary" : "text-muted-foreground"
              }
            />
            {activeFilterCount > 0 && (
              <Animated.View
                className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full w-4 h-4 items-center justify-center"
                entering={ZoomIn.duration(200)}
              >
                <Text className="text-[10px] font-bold text-primary-foreground">
                  {activeFilterCount}
                </Text>
              </Animated.View>
            )}
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

      {/* 过滤器标签 */}
      {renderFilterTags()}

      {/* 展开的过滤器面板 */}
      {showFilters && (
        <Animated.View
          style={filterContainerStyle}
          className="overflow-hidden px-4"
        >
          <View className="bg-card/80 dark:bg-card/60 backdrop-blur-lg p-4 rounded-xl border border-border/30 space-y-3">
            {/* 过滤器选项行 */}
            <View className="flex-row justify-between items-center flex-wrap gap-2">
              {/* 状态过滤器 */}
              <FilterOption
                title="状态"
                options={statusOptions}
                currentValue={filters.status}
                onSelect={(value) => updateFilter("status", value)}
                icon={Tag}
              />

              {/* 服务类型过滤器 */}
              <FilterOption
                title="服务"
                options={serviceOptions}
                currentValue={filters.serviceType}
                onSelect={(value) => updateFilter("serviceType", value)}
                icon={Server}
              />

              {/* 排序依据过滤器 */}
              <FilterOption
                title="排序"
                options={sortByOptions}
                currentValue={filters.sortBy}
                onSelect={(value) => updateFilter("sortBy", value)}
                icon={ChevronsUpDown}
              />
            </View>

            {/* 重置按钮 */}
            <View className="flex-row justify-end">
              <Animated.View style={resetBtnStyle}>
                <Button
                  variant="outline"
                  size="sm"
                  onPress={resetFilters}
                  className={`
                    rounded-full px-3 py-1
                    flex-row items-center
                    ${
                      hasActiveFilters
                        ? "border-primary/20 bg-primary/10"
                        : "opacity-50"
                    }
                  `}
                  accessibilityLabel="重置所有过滤器"
                  accessibilityHint="清除当前应用的所有过滤条件"
                >
                  <FilterX size={14} className="mr-2 text-primary" />
                  <Label className="text-xs text-primary">重置过滤器</Label>
                </Button>
              </Animated.View>
            </View>
          </View>
        </Animated.View>
      )}

      {/* 结果计数 */}
      {renderResultCount()}
    </Animated.View>
  );
};

export default React.memo(ScanFilterBar);
