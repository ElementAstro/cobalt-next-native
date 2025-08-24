/**
 * Common type definitions for enhanced type safety
 * Following 2025 TypeScript best practices
 */

// Utility types for better type safety
export type NonEmptyArray<T> = [T, ...T[]];

export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, Keys>> &
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
  }[Keys];

// Theme-aware props
export interface ThemeAwareProps {
  isDarkMode?: boolean;
  colorScheme?: 'light' | 'dark' | 'auto';
}

// Enhanced component props with accessibility
export interface AccessibleComponentProps {
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: string;
  testID?: string;
}

// Performance optimized list item
export interface OptimizedListItemProps extends AccessibleComponentProps {
  id: string;
  data: unknown;
  index: number;
  isLast?: boolean;
}

// Animation configuration types
export interface AnimationConfig {
  duration?: number;
  delay?: number;
  easing?: 'ease' | 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
  useNativeDriver?: boolean;
}

// Network state types
export interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string | null;
}

// Form validation types
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface FormField<T = string> {
  value: T;
  error?: string;
  touched: boolean;
  validation?: ValidationResult;
}

// API response wrapper
export interface ApiResponse<T = unknown> {
  data: T;
  success: boolean;
  message?: string;
  timestamp: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// Event handler types
export type EventHandler<T = unknown> = (event: T) => void | Promise<void>;
export type AsyncEventHandler<T = unknown> = (event: T) => Promise<void>;

// Component ref types
export interface ComponentHandle {
  focus: () => void;
  blur: () => void;
  reset?: () => void;
}

// Platform-specific types
export interface PlatformDimensions {
  width: number;
  height: number;
  scale: number;
  fontScale: number;
}

export interface DeviceInfo {
  platform: 'ios' | 'android' | 'web';
  version: string;
  isTablet: boolean;
  hasNotch: boolean;
}
