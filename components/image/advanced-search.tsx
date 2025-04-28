import React, { useState } from "react";
import { View } from "react-native";
import { Calendar } from "lucide-react-native";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Text } from "~/components/ui/text";
import DateTimePicker from "@react-native-community/datetimepicker";

interface SearchFilters {
  name: string;
  extension: string;
  minSize?: number;
  maxSize?: number;
  dateFrom?: Date;
  dateTo?: Date;
}

interface Props {
  onSearch: (filters: SearchFilters) => void;
}

export const AdvancedSearch: React.FC<Props> = ({ onSearch }) => {
  const [filters, setFilters] = useState<SearchFilters>({
    name: "",
    extension: "",
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateType, setDateType] = useState<"from" | "to">("from");

  const handleDateSelect = (event: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      setFilters((prev) => ({
        ...prev,
        [dateType === "from" ? "dateFrom" : "dateTo"]: date,
      }));
    }
  };

  return (
    <View className="p-4 space-y-4">
      <Input
        placeholder="文件名"
        value={filters.name}
        onChangeText={(name) => setFilters((prev) => ({ ...prev, name }))}
      />

      <View className="flex-row space-x-2">
        <Input
          placeholder="文件类型 (如: jpg)"
          value={filters.extension}
          onChangeText={(extension) =>
            setFilters((prev) => ({ ...prev, extension }))
          }
          className="flex-1"
        />

        <Button
          variant="outline"
          size="icon"
          onPress={() => {
            setDateType("from");
            setShowDatePicker(true);
          }}
        >
          <Calendar className="h-4 w-4" />
        </Button>
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={
            filters[dateType === "from" ? "dateFrom" : "dateTo"] || new Date()
          }
          mode="date"
          onChange={handleDateSelect}
        />
      )}

      <Button onPress={() => onSearch(filters)}>应用筛选</Button>
    </View>
  );
};
