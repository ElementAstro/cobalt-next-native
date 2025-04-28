import React, { useMemo } from "react";
import { View, TouchableOpacity } from "react-native";
import {
  Calendar,
  FileType2,
  Star,
  Search,
  SortAsc,
  SortDesc,
  Filter,
  Image as ImageIcon,
  File,
  Folder,
  Clock,
  ChevronDown,
} from "lucide-react-native";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Text } from "~/components/ui/text";
import { Card } from "~/components/ui/card";
import { useFileStore } from "~/stores/useImageStore";

// 使用与 store 一致的类型
type FilterType = "all" | "files" | "folders";
type SortType = "name" | "date" | "size";

interface FilterOption {
  value: FilterType;
  label: string;
  icon: React.ElementType;
}

interface SortOption {
  value: SortType;
  label: string;
  icon: React.ElementType;
}

interface FilterBarProps {
  onFilterChange?: (type: FilterType) => void;
  activeFilters?: string[];
  isLandscape?: boolean;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  onFilterChange,
  activeFilters = [],
  isLandscape = false,
}) => {
  const {
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    searchQuery,
    setSearchQuery,
    filterType,
    setFilterType,
  } = useFileStore();

  const filterOptions: FilterOption[] = useMemo(
    () => [
      {
        value: "all",
        label: "全部",
        icon: File,
      },
      {
        value: "files",
        label: "文件",
        icon: ImageIcon,
      },
      {
        value: "folders",
        label: "文件夹",
        icon: Folder,
      },
    ],
    []
  );

  const sortOptions: SortOption[] = useMemo(
    () => [
      {
        value: "name",
        label: "名称",
        icon: FileType2,
      },
      {
        value: "date",
        label: "日期",
        icon: Calendar,
      },
      {
        value: "size",
        label: "大小",
        icon: Filter,
      },
    ],
    []
  );

  // 动画样式
  const containerStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: withSpring(0, {
          damping: 15,
          stiffness: 100,
        }),
      },
    ],
  }));

  // 获取当前选中的过滤器标签
  const currentFilter = useMemo(() => {
    return filterOptions.find((option) => option.value === filterType);
  }, [filterType, filterOptions]);

  // 获取当前选中的排序方式
  const currentSort = useMemo(() => {
    return sortOptions.find((option) => option.value === sortBy);
  }, [sortBy, sortOptions]);

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      style={[containerStyle]}
      className="space-y-3 pb-2"
    >
      {/* 搜索栏 */}
      <View className="px-4 flex-row items-center space-x-2">
        <View className="flex-1 relative">
          <Input
            placeholder="搜索文件..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="pl-10 pr-4 h-12 bg-muted/50 border-0 rounded-2xl"
          />
          <Search className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground" />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 h-8 w-8"
              onPress={() => setSearchQuery("")}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          )}
        </View>

        <Button
          variant="outline"
          size="icon"
          className="h-12 w-12 rounded-2xl"
          onPress={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
        >
          {sortOrder === "asc" ? (
            <SortAsc className="h-5 w-5" />
          ) : (
            <SortDesc className="h-5 w-5" />
          )}
        </Button>
      </View>

      {/* 过滤器和排序选项 */}
      <View className="px-4 flex-row items-center space-x-2">
        <View className="flex-1">
          <Card className="p-2 bg-muted/50 border-0">
            <View className="flex-row flex-wrap gap-2">
              {filterOptions.map(({ value, label, icon: Icon }) => (
                <TouchableOpacity
                  key={value}
                  onPress={() => {
                    setFilterType(value);
                    onFilterChange?.(value);
                  }}
                >
                  <View
                    className={`
                      flex-row items-center px-3 py-2 rounded-lg
                      ${filterType === value ? "bg-primary" : "bg-transparent"}
                    `}
                  >
                    <Icon
                      className={`h-4 w-4 mr-2 ${
                        filterType === value
                          ? "text-primary-foreground"
                          : "text-foreground"
                      }`}
                    />
                    <Text
                      className={
                        filterType === value
                          ? "text-primary-foreground"
                          : "text-foreground"
                      }
                    >
                      {label}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </Card>
        </View>

        <Card className="p-2 bg-muted/50 border-0">
          <View className="flex-row flex-wrap gap-2">
            {sortOptions.map(({ value, label, icon: Icon }) => (
              <TouchableOpacity key={value} onPress={() => setSortBy(value)}>
                <View
                  className={`
                    flex-row items-center px-3 py-2 rounded-lg
                    ${sortBy === value ? "bg-primary" : "bg-transparent"}
                  `}
                >
                  <Icon
                    className={`h-4 w-4 mr-2 ${
                      sortBy === value
                        ? "text-primary-foreground"
                        : "text-foreground"
                    }`}
                  />
                  <Text
                    className={
                      sortBy === value
                        ? "text-primary-foreground"
                        : "text-foreground"
                    }
                  >
                    {label}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </Card>
      </View>

      {/* 活动过滤器标签 */}
      {activeFilters.length > 0 && (
        <Animated.View
          entering={FadeIn}
          className="px-4 flex-row flex-wrap gap-2"
        >
          {activeFilters.map((filter) => (
            <TouchableOpacity
              key={filter}
              onPress={() => onFilterChange?.(filter as FilterType)}
            >
              <View className="bg-secondary px-3 py-1 rounded-full flex-row items-center">
                <Text className="text-secondary-foreground">{filter}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </Animated.View>
      )}
    </Animated.View>
  );
};

export default React.memo(FilterBar);
