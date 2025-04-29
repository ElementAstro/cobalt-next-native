import React from 'react';
import { Modal, Platform, TouchableOpacity, View } from 'react-native';
import { Button } from '../ui/button';
import { Text } from '../ui/text';
import { SortAsc, SortDesc, Filter } from 'lucide-react-native';
import { ActionSheetIOS } from 'react-native';

interface SortMenuProps {
  isVisible: boolean;
  onClose: () => void;
  onSortChange: (type: 'name' | 'date' | 'size') => void;
  onOrderChange: () => void;
  sortOrder: 'asc' | 'desc';
  filterType: 'all' | 'folders' | 'files';
  onFilterChange: (type: 'all' | 'folders' | 'files') => void;
}

export function SortMenu({
  isVisible,
  onClose,
  onSortChange,
  onOrderChange,
  sortOrder,
  filterType,
  onFilterChange,
}: SortMenuProps) {
  const handleSortPress = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [
            'Cancel',
            'Sort by name',
            'Sort by date',
            'Sort by size',
            sortOrder === 'asc' ? 'Sort descending' : 'Sort ascending',
          ],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) onSortChange('name');
          else if (buttonIndex === 2) onSortChange('date');
          else if (buttonIndex === 3) onSortChange('size');
          else if (buttonIndex === 4) onOrderChange();
        }
      );
      onClose();
    }
  };

  // For Android - Modal menu
  if (Platform.OS === 'android') {
    return (
      <Modal
        visible={isVisible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <TouchableOpacity
          className="flex-1 bg-black/50"
          activeOpacity={1}
          onPress={onClose}
        >
          <View className="bg-card rounded-lg m-4 overflow-hidden">
            <TouchableOpacity
              className="p-4 border-b border-border"
              onPress={() => {
                onSortChange('name');
                onClose();
              }}
            >
              <Text>Sort by name</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="p-4 border-b border-border"
              onPress={() => {
                onSortChange('date');
                onClose();
              }}
            >
              <Text>Sort by date</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="p-4 border-b border-border"
              onPress={() => {
                onSortChange('size');
                onClose();
              }}
            >
              <Text>Sort by size</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="p-4 border-b border-border"
              onPress={() => {
                onOrderChange();
                onClose();
              }}
            >
              <Text>{sortOrder === 'asc' ? 'Sort descending' : 'Sort ascending'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="p-4"
              onPress={() => {
                onFilterChange(filterType === 'all' ? 'folders' : 'all');
                onClose();
              }}
            >
              <Text>
                {filterType === 'all'
                  ? 'Show folders only'
                  : filterType === 'folders'
                  ? 'Show files only'
                  : 'Show all'}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  }

  return (
    <View className="flex-row space-x-2">
      <Button variant="ghost" size="icon" onPress={handleSortPress}>
        {sortOrder === 'asc' ? <SortAsc /> : <SortDesc />}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onPress={() => onFilterChange(filterType === 'all' ? 'folders' : 'all')}
      >
        <Filter />
      </Button>
    </View>
  );
}