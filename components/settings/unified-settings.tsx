/**
 * Unified settings component providing centralized settings management UI
 * Replaces scattered settings across different features
 */

import React, { useState } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { Search, Download, Upload, RotateCcw, Settings as SettingsIcon } from 'lucide-react-native';
import { Text } from '~/components/ui/text';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Switch } from '~/components/ui/switch';
import { EnhancedButton } from '~/components/ui/enhanced-button';
import { 
  useSettingsCategories, 
  useSettingsCategory, 
  useSettingsSearch,
  useSettingsImportExport,
  useBulkSettings,
  useSetting
} from '~/lib/settings/use-settings';

interface UnifiedSettingsProps {
  initialCategory?: string;
  showSearch?: boolean;
  showImportExport?: boolean;
}

export function UnifiedSettings({ 
  initialCategory = 'app',
  showSearch = true,
  showImportExport = true 
}: UnifiedSettingsProps) {
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const categories = useSettingsCategories();
  const { settings, category } = useSettingsCategory(activeCategory);
  const { search } = useSettingsSearch();
  const { exportSettings, importSettings, isProcessing } = useSettingsImportExport();
  const { resetAll, resetCategory } = useBulkSettings();

  const searchResults = searchQuery ? search(searchQuery) : [];
  const displaySettings = searchQuery ? searchResults : settings;

  const handleExport = async () => {
    try {
      const data = await exportSettings();
      // In a real app, this would trigger a file save dialog or share sheet
      Alert.alert('Export Complete', `Settings exported with ${Object.keys(data.settings).length} customized settings`);
    } catch (error) {
      Alert.alert('Export Failed', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const handleResetCategory = async () => {
    Alert.alert(
      'Reset Category',
      `Are you sure you want to reset all ${category?.label} settings to defaults?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          style: 'destructive',
          onPress: async () => {
            try {
              await resetCategory(activeCategory);
              Alert.alert('Success', 'Settings reset to defaults');
            } catch (error) {
              Alert.alert('Error', 'Failed to reset settings');
            }
          }
        }
      ]
    );
  };

  const handleResetAll = async () => {
    Alert.alert(
      'Reset All Settings',
      'Are you sure you want to reset ALL settings to defaults? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset All', 
          style: 'destructive',
          onPress: async () => {
            try {
              await resetAll();
              Alert.alert('Success', 'All settings reset to defaults');
            } catch (error) {
              Alert.alert('Error', 'Failed to reset settings');
            }
          }
        }
      ]
    );
  };

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="p-4 border-b border-border">
        <View className="flex-row items-center justify-between mb-4">
          <View>
            <Text className="text-2xl font-bold">Settings</Text>
            <Text className="text-muted-foreground">
              {searchQuery ? `Search results for "${searchQuery}"` : category?.description}
            </Text>
          </View>
          <SettingsIcon size={24} className="text-muted-foreground" />
        </View>

        {/* Search */}
        {showSearch && (
          <Input
            placeholder="Search settings..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            leftIcon={<Search size={16} className="text-muted-foreground" />}
            className="mb-4"
          />
        )}

        {/* Category Tabs */}
        {!searchQuery && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
            <View className="flex-row gap-2">
              {categories.map((cat) => (
                <Button
                  key={cat.id}
                  variant={activeCategory === cat.id ? 'default' : 'outline'}
                  size="sm"
                  onPress={() => setActiveCategory(cat.id)}
                >
                  <Text>{cat.label}</Text>
                </Button>
              ))}
            </View>
          </ScrollView>
        )}

        {/* Action Buttons */}
        <View className="flex-row gap-2">
          <Switch
            checked={showAdvanced}
            onCheckedChange={setShowAdvanced}
            className="mr-2"
          />
          <Text className="text-sm text-muted-foreground mr-auto">Show Advanced</Text>
          
          {showImportExport && (
            <>
              <Button
                variant="outline"
                size="sm"
                onPress={handleExport}
                disabled={isProcessing}
              >
                <Upload size={16} className="mr-1" />
                <Text>Export</Text>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onPress={handleResetCategory}
                disabled={isProcessing}
              >
                <RotateCcw size={16} className="mr-1" />
                <Text>Reset</Text>
              </Button>
            </>
          )}
        </View>
      </View>

      {/* Settings List */}
      <ScrollView className="flex-1 p-4">
        <View className="space-y-4">
          {displaySettings
            .filter(item => showAdvanced || !item.definition.isAdvanced)
            .map((item) => (
              <SettingItem
                key={item.definition.key}
                definition={item.definition}
                value={item.value}
                relevance={searchQuery ? (item as any).relevance : undefined}
              />
            ))}

          {displaySettings.length === 0 && (
            <Card className="p-8">
              <CardContent className="items-center">
                <Text className="text-muted-foreground text-center">
                  {searchQuery ? 'No settings found matching your search' : 'No settings in this category'}
                </Text>
              </CardContent>
            </Card>
          )}
        </View>

        {/* Danger Zone */}
        {!searchQuery && activeCategory === 'app' && (
          <Card className="mt-8 border-destructive/20">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>
                These actions cannot be undone
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EnhancedButton
                variant="destructive"
                onPress={handleResetAll}
                disabled={isProcessing}
                className="w-full"
              >
                Reset All Settings
              </EnhancedButton>
            </CardContent>
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

interface SettingItemProps {
  definition: any;
  value: any;
  relevance?: number;
}

function SettingItem({ definition, value, relevance }: SettingItemProps) {
  const { value: currentValue, setValue, reset, isDefault } = useSetting(definition.key);

  const handleChange = async (newValue: any) => {
    try {
      await setValue(newValue);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to update setting');
    }
  };

  const renderControl = () => {
    switch (definition.type) {
      case 'boolean':
        return (
          <Switch
            checked={currentValue ?? definition.defaultValue}
            onCheckedChange={handleChange}
          />
        );

      case 'string':
        return (
          <Input
            value={currentValue ?? definition.defaultValue}
            onChangeText={handleChange}
            placeholder={definition.defaultValue}
            className="flex-1 ml-4"
          />
        );

      case 'number':
        return (
          <Input
            value={String(currentValue ?? definition.defaultValue)}
            onChangeText={(text) => {
              const num = parseInt(text, 10);
              if (!isNaN(num)) handleChange(num);
            }}
            keyboardType="numeric"
            placeholder={String(definition.defaultValue)}
            className="flex-1 ml-4 w-24"
          />
        );

      case 'select':
        return (
          <View className="flex-1 ml-4">
            {definition.options?.map((option: any) => (
              <Button
                key={option.value}
                variant={currentValue === option.value ? 'default' : 'outline'}
                size="sm"
                onPress={() => handleChange(option.value)}
                className="mb-1"
              >
                <Text>{option.label}</Text>
              </Button>
            ))}
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <Card className={`${relevance ? 'border-primary/20' : ''}`}>
      <CardContent className="p-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <View className="flex-row items-center">
              <Text className="font-medium">{definition.label}</Text>
              {!isDefault && (
                <View className="w-2 h-2 rounded-full bg-primary ml-2" />
              )}
              {relevance && (
                <Text className="text-xs text-muted-foreground ml-2">
                  {Math.round(relevance * 100)}% match
                </Text>
              )}
            </View>
            {definition.description && (
              <Text className="text-sm text-muted-foreground mt-1">
                {definition.description}
              </Text>
            )}
            {definition.requiresRestart && (
              <Text className="text-xs text-orange-500 mt-1">
                Requires app restart
              </Text>
            )}
          </View>
          
          <View className="flex-row items-center">
            {renderControl()}
            {!isDefault && (
              <Button
                variant="ghost"
                size="sm"
                onPress={reset}
                className="ml-2"
              >
                <RotateCcw size={16} />
              </Button>
            )}
          </View>
        </View>
      </CardContent>
    </Card>
  );
}
