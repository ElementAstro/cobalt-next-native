/**
 * React hooks for centralized settings management
 * Provides easy access to settings throughout the app
 */

import { useState, useEffect, useCallback } from 'react';
import { SettingsManager, type SettingDefinition, type SettingValue, type SettingCategory } from './settings-manager';

/**
 * Hook to get a specific setting value
 */
export function useSetting<T>(key: string): {
  value: T | undefined;
  setValue: (value: T) => Promise<void>;
  reset: () => Promise<void>;
  isDefault: boolean;
  definition: SettingDefinition | undefined;
} {
  const manager = SettingsManager.getInstance();
  const [value, setValue] = useState<T | undefined>(manager.get<T>(key));
  const [isDefault, setIsDefault] = useState(true);

  useEffect(() => {
    const subscription = manager.get$<T>(key).subscribe(newValue => {
      setValue(newValue);
    });

    // Get current default status
    const settingValue = manager['values$'].value.get(key);
    setIsDefault(settingValue?.isDefault ?? true);

    return () => subscription.unsubscribe();
  }, [key, manager]);

  const updateValue = useCallback(async (newValue: T) => {
    await manager.set(key, newValue);
  }, [key, manager]);

  const resetValue = useCallback(async () => {
    await manager.reset(key);
  }, [key, manager]);

  const definition = manager['definitions'].get(key);

  return {
    value,
    setValue: updateValue,
    reset: resetValue,
    isDefault,
    definition,
  };
}

/**
 * Hook to get all settings in a category
 */
export function useSettingsCategory(categoryId: string): {
  settings: Array<{
    definition: SettingDefinition;
    value: SettingValue;
  }>;
  category: SettingCategory | undefined;
} {
  const manager = SettingsManager.getInstance();
  const [settings, setSettings] = useState<Array<{
    definition: SettingDefinition;
    value: SettingValue;
  }>>([]);

  useEffect(() => {
    const updateSettings = () => {
      setSettings(manager.getByCategory(categoryId));
    };

    updateSettings();

    // Subscribe to value changes
    const subscription = manager['values$'].subscribe(() => {
      updateSettings();
    });

    return () => subscription.unsubscribe();
  }, [categoryId, manager]);

  const category = manager['categories'].get(categoryId);

  return { settings, category };
}

/**
 * Hook to get all setting categories
 */
export function useSettingsCategories(): SettingCategory[] {
  const manager = SettingsManager.getInstance();
  return manager.getCategories();
}

/**
 * Hook for settings search functionality
 */
export function useSettingsSearch(): {
  search: (query: string) => Array<{
    definition: SettingDefinition;
    value: SettingValue;
    relevance: number;
  }>;
  isSearching: boolean;
} {
  const manager = SettingsManager.getInstance();
  const [isSearching, setIsSearching] = useState(false);

  const search = useCallback((query: string) => {
    setIsSearching(true);
    try {
      return manager.search(query);
    } finally {
      setIsSearching(false);
    }
  }, [manager]);

  return { search, isSearching };
}

/**
 * Hook for settings import/export
 */
export function useSettingsImportExport(): {
  exportSettings: () => Promise<any>;
  importSettings: (data: any) => Promise<{
    imported: number;
    skipped: number;
    errors: string[];
  }>;
  isProcessing: boolean;
} {
  const manager = SettingsManager.getInstance();
  const [isProcessing, setIsProcessing] = useState(false);

  const exportSettings = useCallback(async () => {
    setIsProcessing(true);
    try {
      return await manager.exportSettings();
    } finally {
      setIsProcessing(false);
    }
  }, [manager]);

  const importSettings = useCallback(async (data: any) => {
    setIsProcessing(true);
    try {
      return await manager.importSettings(data);
    } finally {
      setIsProcessing(false);
    }
  }, [manager]);

  return { exportSettings, importSettings, isProcessing };
}

/**
 * Hook for bulk settings operations
 */
export function useBulkSettings(): {
  resetAll: () => Promise<void>;
  resetCategory: (categoryId: string) => Promise<void>;
  updateMultiple: (updates: Record<string, any>) => Promise<void>;
  isProcessing: boolean;
} {
  const manager = SettingsManager.getInstance();
  const [isProcessing, setIsProcessing] = useState(false);

  const resetAll = useCallback(async () => {
    setIsProcessing(true);
    try {
      await manager.resetAll();
    } finally {
      setIsProcessing(false);
    }
  }, [manager]);

  const resetCategory = useCallback(async (categoryId: string) => {
    setIsProcessing(true);
    try {
      const settings = manager.getByCategory(categoryId);
      for (const { definition } of settings) {
        await manager.reset(definition.key);
      }
    } finally {
      setIsProcessing(false);
    }
  }, [manager]);

  const updateMultiple = useCallback(async (updates: Record<string, any>) => {
    setIsProcessing(true);
    try {
      for (const [key, value] of Object.entries(updates)) {
        await manager.set(key, value);
      }
    } finally {
      setIsProcessing(false);
    }
  }, [manager]);

  return { resetAll, resetCategory, updateMultiple, isProcessing };
}

/**
 * Hook for settings validation
 */
export function useSettingsValidation(): {
  validateSetting: (key: string, value: any) => string | null;
  validateDependencies: (key: string) => string[];
  getRestartRequired: () => string[];
} {
  const manager = SettingsManager.getInstance();

  const validateSetting = useCallback((key: string, value: any) => {
    const definition = manager['definitions'].get(key);
    if (!definition) return 'Setting not found';

    if (definition.validation) {
      return definition.validation(value);
    }

    return null;
  }, [manager]);

  const validateDependencies = useCallback((key: string) => {
    return manager.validateDependencies(key);
  }, [manager]);

  const getRestartRequired = useCallback(() => {
    return manager.getRestartRequiredSettings();
  }, [manager]);

  return { validateSetting, validateDependencies, getRestartRequired };
}

/**
 * Hook for theme-specific settings
 */
export function useThemeSettings(): {
  theme: 'light' | 'dark' | 'auto';
  setTheme: (theme: 'light' | 'dark' | 'auto') => Promise<void>;
  primaryColor: string;
  setPrimaryColor: (color: string) => Promise<void>;
  fontSize: 'small' | 'medium' | 'large';
  setFontSize: (size: 'small' | 'medium' | 'large') => Promise<void>;
} {
  const { value: theme, setValue: setTheme } = useSetting<'light' | 'dark' | 'auto'>('app.theme');
  const { value: primaryColor, setValue: setPrimaryColor } = useSetting<string>('app.primaryColor');
  const { value: fontSize, setValue: setFontSize } = useSetting<'small' | 'medium' | 'large'>('app.fontSize');

  return {
    theme: theme || 'auto',
    setTheme,
    primaryColor: primaryColor || '#3b82f6',
    setPrimaryColor,
    fontSize: fontSize || 'medium',
    setFontSize,
  };
}

/**
 * Hook for download-specific settings
 */
export function useDownloadSettings(): {
  maxConcurrent: number;
  setMaxConcurrent: (value: number) => Promise<void>;
  autoResume: boolean;
  setAutoResume: (value: boolean) => Promise<void>;
  location: string;
  setLocation: (value: string) => Promise<void>;
} {
  const { value: maxConcurrent, setValue: setMaxConcurrent } = useSetting<number>('downloads.maxConcurrent');
  const { value: autoResume, setValue: setAutoResume } = useSetting<boolean>('downloads.autoResume');
  const { value: location, setValue: setLocation } = useSetting<string>('downloads.location');

  return {
    maxConcurrent: maxConcurrent || 3,
    setMaxConcurrent,
    autoResume: autoResume ?? true,
    setAutoResume,
    location: location || 'Downloads',
    setLocation,
  };
}

/**
 * Hook for scanner-specific settings
 */
export function useScannerSettings(): {
  timeout: number;
  setTimeout: (value: number) => Promise<void>;
  concurrency: number;
  setConcurrency: (value: number) => Promise<void>;
  stealthMode: boolean;
  setStealthMode: (value: boolean) => Promise<void>;
} {
  const { value: timeout, setValue: setTimeout } = useSetting<number>('scanner.timeout');
  const { value: concurrency, setValue: setConcurrency } = useSetting<number>('scanner.concurrency');
  const { value: stealthMode, setValue: setStealthMode } = useSetting<boolean>('scanner.stealthMode');

  return {
    timeout: timeout || 5000,
    setTimeout,
    concurrency: concurrency || 50,
    setConcurrency,
    stealthMode: stealthMode ?? false,
    setStealthMode,
  };
}

/**
 * Hook for performance-specific settings
 */
export function usePerformanceSettings(): {
  enableMonitoring: boolean;
  setEnableMonitoring: (value: boolean) => Promise<void>;
  optimizeForBattery: boolean;
  setOptimizeForBattery: (value: boolean) => Promise<void>;
  backgroundProcessing: boolean;
  setBackgroundProcessing: (value: boolean) => Promise<void>;
} {
  const { value: enableMonitoring, setValue: setEnableMonitoring } = useSetting<boolean>('performance.enableMonitoring');
  const { value: optimizeForBattery, setValue: setOptimizeForBattery } = useSetting<boolean>('performance.optimizeForBattery');
  const { value: backgroundProcessing, setValue: setBackgroundProcessing } = useSetting<boolean>('performance.backgroundProcessing');

  return {
    enableMonitoring: enableMonitoring ?? true,
    setEnableMonitoring,
    optimizeForBattery: optimizeForBattery ?? false,
    setOptimizeForBattery,
    backgroundProcessing: backgroundProcessing ?? true,
    setBackgroundProcessing,
  };
}
