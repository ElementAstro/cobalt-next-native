/**
 * Centralized settings management system
 * Provides unified interface for all app settings with validation and persistence
 */

import { BehaviorSubject, Observable } from 'rxjs';
import { map, distinctUntilChanged } from 'rxjs/operators';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SettingDefinition<T = any> {
  key: string;
  category: string;
  label: string;
  description?: string;
  type: 'boolean' | 'number' | 'string' | 'select' | 'range' | 'color';
  defaultValue: T;
  validation?: (value: T) => string | null;
  options?: { label: string; value: T }[];
  min?: number;
  max?: number;
  step?: number;
  dependencies?: string[];
  isAdvanced?: boolean;
  requiresRestart?: boolean;
}

export interface SettingCategory {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  order: number;
}

export interface SettingValue<T = any> {
  key: string;
  value: T;
  isDefault: boolean;
  lastModified: number;
  source: 'user' | 'system' | 'import';
}

export interface SettingsExport {
  version: string;
  timestamp: number;
  settings: Record<string, any>;
  metadata: {
    appVersion: string;
    platform: string;
    deviceId?: string;
  };
}

export class SettingsManager {
  private static instance: SettingsManager;
  private definitions = new Map<string, SettingDefinition>();
  private categories = new Map<string, SettingCategory>();
  private values$ = new BehaviorSubject<Map<string, SettingValue>>(new Map());
  private storageKey = 'cobalt-settings-v1';

  static getInstance(): SettingsManager {
    if (!SettingsManager.instance) {
      SettingsManager.instance = new SettingsManager();
    }
    return SettingsManager.instance;
  }

  private constructor() {
    this.initializeDefaultSettings();
    this.loadFromStorage();
  }

  /**
   * Register setting definition
   */
  registerSetting<T>(definition: SettingDefinition<T>): void {
    this.definitions.set(definition.key, definition);
    
    // Set default value if not already set
    const currentValues = this.values$.value;
    if (!currentValues.has(definition.key)) {
      currentValues.set(definition.key, {
        key: definition.key,
        value: definition.defaultValue,
        isDefault: true,
        lastModified: Date.now(),
        source: 'system',
      });
      this.values$.next(new Map(currentValues));
    }
  }

  /**
   * Register setting category
   */
  registerCategory(category: SettingCategory): void {
    this.categories.set(category.id, category);
  }

  /**
   * Get setting value
   */
  get<T>(key: string): T | undefined {
    const settingValue = this.values$.value.get(key);
    return settingValue?.value as T;
  }

  /**
   * Get setting value as observable
   */
  get$<T>(key: string): Observable<T | undefined> {
    return this.values$.pipe(
      map(values => values.get(key)?.value as T),
      distinctUntilChanged()
    );
  }

  /**
   * Set setting value
   */
  async set<T>(key: string, value: T, source: 'user' | 'system' | 'import' = 'user'): Promise<void> {
    const definition = this.definitions.get(key);
    if (!definition) {
      throw new Error(`Setting ${key} is not registered`);
    }

    // Validate value
    if (definition.validation) {
      const error = definition.validation(value);
      if (error) {
        throw new Error(`Invalid value for ${key}: ${error}`);
      }
    }

    // Type validation
    if (!this.validateType(value, definition.type)) {
      throw new Error(`Invalid type for ${key}: expected ${definition.type}`);
    }

    // Range validation for numbers
    if (definition.type === 'number' || definition.type === 'range') {
      const numValue = value as number;
      if (definition.min !== undefined && numValue < definition.min) {
        throw new Error(`Value for ${key} must be at least ${definition.min}`);
      }
      if (definition.max !== undefined && numValue > definition.max) {
        throw new Error(`Value for ${key} must be at most ${definition.max}`);
      }
    }

    // Update value
    const currentValues = new Map(this.values$.value);
    currentValues.set(key, {
      key,
      value,
      isDefault: value === definition.defaultValue,
      lastModified: Date.now(),
      source,
    });

    this.values$.next(currentValues);
    await this.saveToStorage();
  }

  /**
   * Reset setting to default
   */
  async reset(key: string): Promise<void> {
    const definition = this.definitions.get(key);
    if (!definition) {
      throw new Error(`Setting ${key} is not registered`);
    }

    await this.set(key, definition.defaultValue, 'system');
  }

  /**
   * Reset all settings to defaults
   */
  async resetAll(): Promise<void> {
    for (const [key, definition] of this.definitions) {
      await this.set(key, definition.defaultValue, 'system');
    }
  }

  /**
   * Get all settings by category
   */
  getByCategory(categoryId: string): Array<{
    definition: SettingDefinition;
    value: SettingValue;
  }> {
    const result: Array<{ definition: SettingDefinition; value: SettingValue }> = [];
    
    for (const [key, definition] of this.definitions) {
      if (definition.category === categoryId) {
        const value = this.values$.value.get(key);
        if (value) {
          result.push({ definition, value });
        }
      }
    }

    return result.sort((a, b) => a.definition.label.localeCompare(b.definition.label));
  }

  /**
   * Get all categories
   */
  getCategories(): SettingCategory[] {
    return Array.from(this.categories.values()).sort((a, b) => a.order - b.order);
  }

  /**
   * Search settings
   */
  search(query: string): Array<{
    definition: SettingDefinition;
    value: SettingValue;
    relevance: number;
  }> {
    const results: Array<{ definition: SettingDefinition; value: SettingValue; relevance: number }> = [];
    const searchTerms = query.toLowerCase().split(' ');

    for (const [key, definition] of this.definitions) {
      const value = this.values$.value.get(key);
      if (!value) continue;

      const searchText = [
        definition.label,
        definition.description || '',
        definition.key,
        this.categories.get(definition.category)?.label || '',
      ].join(' ').toLowerCase();

      let relevance = 0;
      for (const term of searchTerms) {
        if (searchText.includes(term)) {
          relevance += term.length / searchText.length;
        }
      }

      if (relevance > 0) {
        results.push({ definition, value, relevance });
      }
    }

    return results.sort((a, b) => b.relevance - a.relevance);
  }

  /**
   * Export settings
   */
  async exportSettings(): Promise<SettingsExport> {
    const settings: Record<string, any> = {};
    
    for (const [key, value] of this.values$.value) {
      if (!value.isDefault) {
        settings[key] = value.value;
      }
    }

    return {
      version: '1.0',
      timestamp: Date.now(),
      settings,
      metadata: {
        appVersion: '1.0.0', // Would come from app config
        platform: 'react-native',
      },
    };
  }

  /**
   * Import settings
   */
  async importSettings(exportData: SettingsExport): Promise<{
    imported: number;
    skipped: number;
    errors: string[];
  }> {
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const [key, value] of Object.entries(exportData.settings)) {
      try {
        if (this.definitions.has(key)) {
          await this.set(key, value, 'import');
          imported++;
        } else {
          skipped++;
        }
      } catch (error) {
        errors.push(`${key}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { imported, skipped, errors };
  }

  /**
   * Get settings that require app restart
   */
  getRestartRequiredSettings(): string[] {
    const restartRequired: string[] = [];
    
    for (const [key, definition] of this.definitions) {
      if (definition.requiresRestart) {
        const value = this.values$.value.get(key);
        if (value && !value.isDefault) {
          restartRequired.push(key);
        }
      }
    }

    return restartRequired;
  }

  /**
   * Validate setting dependencies
   */
  validateDependencies(key: string): string[] {
    const definition = this.definitions.get(key);
    if (!definition?.dependencies) return [];

    const errors: string[] = [];
    
    for (const depKey of definition.dependencies) {
      const depValue = this.get(depKey);
      const depDefinition = this.definitions.get(depKey);
      
      if (!depDefinition) {
        errors.push(`Dependency ${depKey} is not registered`);
        continue;
      }

      // Check if dependency is enabled (for boolean dependencies)
      if (depDefinition.type === 'boolean' && !depValue) {
        errors.push(`${definition.label} requires ${depDefinition.label} to be enabled`);
      }
    }

    return errors;
  }

  // Private methods
  private initializeDefaultSettings(): void {
    // App settings category
    this.registerCategory({
      id: 'app',
      label: 'Application',
      description: 'General application settings',
      icon: 'settings',
      order: 1,
    });

    // Downloads settings category
    this.registerCategory({
      id: 'downloads',
      label: 'Downloads',
      description: 'Download management settings',
      icon: 'download',
      order: 2,
    });

    // Scanner settings category
    this.registerCategory({
      id: 'scanner',
      label: 'Network Scanner',
      description: 'Network scanning configuration',
      icon: 'search',
      order: 3,
    });

    // Performance settings category
    this.registerCategory({
      id: 'performance',
      label: 'Performance',
      description: 'Performance and optimization settings',
      icon: 'zap',
      order: 4,
    });

    // Register default settings
    this.registerDefaultSettings();
  }

  private registerDefaultSettings(): void {
    // App settings
    this.registerSetting({
      key: 'app.theme',
      category: 'app',
      label: 'Theme',
      description: 'Choose the app theme',
      type: 'select',
      defaultValue: 'auto',
      options: [
        { label: 'Light', value: 'light' },
        { label: 'Dark', value: 'dark' },
        { label: 'Auto', value: 'auto' },
      ],
    });

    this.registerSetting({
      key: 'app.notifications',
      category: 'app',
      label: 'Enable Notifications',
      description: 'Show notifications for completed operations',
      type: 'boolean',
      defaultValue: true,
    });

    // Download settings
    this.registerSetting({
      key: 'downloads.maxConcurrent',
      category: 'downloads',
      label: 'Max Concurrent Downloads',
      description: 'Maximum number of simultaneous downloads',
      type: 'range',
      defaultValue: 3,
      min: 1,
      max: 10,
      step: 1,
    });

    this.registerSetting({
      key: 'downloads.autoResume',
      category: 'downloads',
      label: 'Auto Resume',
      description: 'Automatically resume downloads when connection is restored',
      type: 'boolean',
      defaultValue: true,
    });

    // Scanner settings
    this.registerSetting({
      key: 'scanner.timeout',
      category: 'scanner',
      label: 'Scan Timeout (ms)',
      description: 'Timeout for individual port scans',
      type: 'number',
      defaultValue: 5000,
      min: 1000,
      max: 30000,
    });

    this.registerSetting({
      key: 'scanner.concurrency',
      category: 'scanner',
      label: 'Concurrent Scans',
      description: 'Number of ports to scan simultaneously',
      type: 'range',
      defaultValue: 50,
      min: 1,
      max: 200,
      step: 1,
    });

    // Performance settings
    this.registerSetting({
      key: 'performance.enableMonitoring',
      category: 'performance',
      label: 'Enable Performance Monitoring',
      description: 'Monitor app performance metrics',
      type: 'boolean',
      defaultValue: true,
    });
  }

  private validateType(value: any, type: string): boolean {
    switch (type) {
      case 'boolean':
        return typeof value === 'boolean';
      case 'number':
      case 'range':
        return typeof value === 'number' && !isNaN(value);
      case 'string':
      case 'select':
      case 'color':
        return typeof value === 'string';
      default:
        return true;
    }
  }

  private async saveToStorage(): Promise<void> {
    try {
      const data = Array.from(this.values$.value.entries());
      await AsyncStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }

  private async loadFromStorage(): Promise<void> {
    try {
      const data = await AsyncStorage.getItem(this.storageKey);
      if (data) {
        const entries = JSON.parse(data) as Array<[string, SettingValue]>;
        const values = new Map(entries);
        this.values$.next(values);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }
}
