import type {
  NonEmptyArray,
  RequireAtLeastOne,
  ThemeAwareProps,
  AccessibleComponentProps,
  OptimizedListItemProps,
  AnimationConfig,
  NetworkState,
  ValidationResult,
  FormField,
  ApiResponse,
  ApiError,
  EventHandler,
  AsyncEventHandler,
  ComponentHandle,
  PlatformDimensions,
  DeviceInfo,
} from '~/types/common';

describe('types/common', () => {
  describe('NonEmptyArray', () => {
    it('should enforce at least one element', () => {
      // These should compile without errors
      const validArray1: NonEmptyArray<string> = ['first'];
      const validArray2: NonEmptyArray<number> = [1, 2, 3];
      
      expect(validArray1).toHaveLength(1);
      expect(validArray2).toHaveLength(3);
      
      // This would cause a TypeScript error if uncommented:
      // const invalidArray: NonEmptyArray<string> = [];
    });

    it('should preserve array methods', () => {
      const array: NonEmptyArray<string> = ['first', 'second'];
      
      expect(array.map(x => x.toUpperCase())).toEqual(['FIRST', 'SECOND']);
      expect(array.filter(x => x.includes('first'))).toEqual(['first']);
      expect(array.length).toBe(2);
    });
  });

  describe('RequireAtLeastOne', () => {
    interface TestObject {
      a?: string;
      b?: number;
      c?: boolean;
    }

    it('should require at least one property', () => {
      // These should be valid
      const valid1: RequireAtLeastOne<TestObject> = { a: 'test' };
      const valid2: RequireAtLeastOne<TestObject> = { b: 42 };
      const valid3: RequireAtLeastOne<TestObject> = { a: 'test', b: 42, c: true };
      
      expect(valid1.a).toBe('test');
      expect(valid2.b).toBe(42);
      expect(valid3.c).toBe(true);
      
      // This would cause a TypeScript error:
      // const invalid: RequireAtLeastOne<TestObject> = {};
    });
  });

  describe('ThemeAwareProps', () => {
    it('should have optional theme properties', () => {
      const props1: ThemeAwareProps = {};
      const props2: ThemeAwareProps = { isDarkMode: true };
      const props3: ThemeAwareProps = { colorScheme: 'dark' };
      const props4: ThemeAwareProps = { isDarkMode: false, colorScheme: 'light' };
      
      expect(props1.isDarkMode).toBeUndefined();
      expect(props2.isDarkMode).toBe(true);
      expect(props3.colorScheme).toBe('dark');
      expect(props4.isDarkMode).toBe(false);
      expect(props4.colorScheme).toBe('light');
    });
  });

  describe('AccessibleComponentProps', () => {
    it('should have optional accessibility properties', () => {
      const props: AccessibleComponentProps = {
        accessibilityLabel: 'Test button',
        accessibilityHint: 'Tap to perform action',
        accessibilityRole: 'button',
        testID: 'test-button',
      };
      
      expect(props.accessibilityLabel).toBe('Test button');
      expect(props.accessibilityHint).toBe('Tap to perform action');
      expect(props.accessibilityRole).toBe('button');
      expect(props.testID).toBe('test-button');
    });

    it('should allow empty props', () => {
      const props: AccessibleComponentProps = {};
      
      expect(props.accessibilityLabel).toBeUndefined();
      expect(props.testID).toBeUndefined();
    });
  });

  describe('OptimizedListItemProps', () => {
    it('should extend AccessibleComponentProps', () => {
      const props: OptimizedListItemProps = {
        id: 'item-1',
        data: { name: 'Test Item' },
        index: 0,
        accessibilityLabel: 'List item',
        testID: 'list-item-1',
      };
      
      expect(props.id).toBe('item-1');
      expect(props.data).toEqual({ name: 'Test Item' });
      expect(props.index).toBe(0);
      expect(props.accessibilityLabel).toBe('List item');
      expect(props.isLast).toBeUndefined();
    });

    it('should handle isLast property', () => {
      const props: OptimizedListItemProps = {
        id: 'item-last',
        data: null,
        index: 9,
        isLast: true,
      };
      
      expect(props.isLast).toBe(true);
    });
  });

  describe('AnimationConfig', () => {
    it('should have optional animation properties', () => {
      const config1: AnimationConfig = {};
      const config2: AnimationConfig = {
        duration: 300,
        delay: 100,
        easing: 'ease-in-out',
        useNativeDriver: true,
      };
      
      expect(config1.duration).toBeUndefined();
      expect(config2.duration).toBe(300);
      expect(config2.delay).toBe(100);
      expect(config2.easing).toBe('ease-in-out');
      expect(config2.useNativeDriver).toBe(true);
    });

    it('should enforce valid easing values', () => {
      const validEasings: Array<'ease' | 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out'> = [
        'ease', 'linear', 'ease-in', 'ease-out', 'ease-in-out'
      ];

      validEasings.forEach(easing => {
        const config: AnimationConfig = { easing: easing };
        expect(config.easing).toBe(easing);
      });
    });
  });

  describe('NetworkState', () => {
    it('should represent network connectivity state', () => {
      const connected: NetworkState = {
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
      };
      
      const disconnected: NetworkState = {
        isConnected: false,
        isInternetReachable: false,
        type: null,
      };
      
      expect(connected.isConnected).toBe(true);
      expect(connected.type).toBe('wifi');
      expect(disconnected.isConnected).toBe(false);
      expect(disconnected.type).toBeNull();
    });
  });

  describe('ValidationResult', () => {
    it('should represent validation outcome', () => {
      const valid: ValidationResult = {
        isValid: true,
        errors: [],
      };
      
      const invalid: ValidationResult = {
        isValid: false,
        errors: ['Required field', 'Invalid format'],
        warnings: ['Consider using a stronger password'],
      };
      
      expect(valid.isValid).toBe(true);
      expect(valid.errors).toHaveLength(0);
      expect(invalid.isValid).toBe(false);
      expect(invalid.errors).toHaveLength(2);
      expect(invalid.warnings).toHaveLength(1);
    });
  });

  describe('FormField', () => {
    it('should represent form field state', () => {
      const field: FormField<string> = {
        value: 'test@example.com',
        touched: true,
        validation: {
          isValid: true,
          errors: [],
        },
      };
      
      expect(field.value).toBe('test@example.com');
      expect(field.touched).toBe(true);
      expect(field.validation?.isValid).toBe(true);
    });

    it('should handle different value types', () => {
      const numberField: FormField<number> = {
        value: 42,
        touched: false,
      };
      
      const booleanField: FormField<boolean> = {
        value: true,
        touched: true,
        error: 'Invalid selection',
      };
      
      expect(numberField.value).toBe(42);
      expect(booleanField.value).toBe(true);
      expect(booleanField.error).toBe('Invalid selection');
    });
  });

  describe('ApiResponse', () => {
    it('should represent API response structure', () => {
      const response: ApiResponse<{ id: number; name: string }> = {
        data: { id: 1, name: 'Test' },
        success: true,
        message: 'Operation successful',
        timestamp: '2023-01-01T00:00:00Z',
      };
      
      expect(response.data.id).toBe(1);
      expect(response.success).toBe(true);
      expect(response.message).toBe('Operation successful');
    });

    it('should handle error responses', () => {
      const errorResponse: ApiResponse<null> = {
        data: null,
        success: false,
        message: 'Operation failed',
        timestamp: '2023-01-01T00:00:00Z',
      };
      
      expect(errorResponse.data).toBeNull();
      expect(errorResponse.success).toBe(false);
    });
  });

  describe('ApiError', () => {
    it('should represent API error structure', () => {
      const error: ApiError = {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input provided',
        details: {
          field: 'email',
          reason: 'Invalid format',
        },
      };
      
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.message).toBe('Invalid input provided');
      expect(error.details?.field).toBe('email');
    });
  });

  describe('EventHandler types', () => {
    it('should handle synchronous events', () => {
      const handler: EventHandler<string> = (event) => {
        expect(typeof event).toBe('string');
      };
      
      handler('test event');
    });

    it('should handle asynchronous events', async () => {
      const handler: AsyncEventHandler<number> = async (event) => {
        expect(typeof event).toBe('number');
        return Promise.resolve();
      };
      
      await handler(42);
    });
  });

  describe('ComponentHandle', () => {
    it('should define component imperative interface', () => {
      const handle: ComponentHandle = {
        focus: jest.fn(),
        blur: jest.fn(),
        reset: jest.fn(),
      };
      
      handle.focus();
      handle.blur();
      handle.reset?.();
      
      expect(handle.focus).toHaveBeenCalled();
      expect(handle.blur).toHaveBeenCalled();
      expect(handle.reset).toHaveBeenCalled();
    });
  });

  describe('PlatformDimensions', () => {
    it('should represent platform dimensions', () => {
      const dimensions: PlatformDimensions = {
        width: 375,
        height: 812,
        scale: 2,
        fontScale: 1.2,
      };
      
      expect(dimensions.width).toBe(375);
      expect(dimensions.height).toBe(812);
      expect(dimensions.scale).toBe(2);
      expect(dimensions.fontScale).toBe(1.2);
    });
  });

  describe('DeviceInfo', () => {
    it('should represent device information', () => {
      const iosDevice: DeviceInfo = {
        platform: 'ios',
        version: '15.0',
        isTablet: false,
        hasNotch: true,
      };
      
      const androidDevice: DeviceInfo = {
        platform: 'android',
        version: '12',
        isTablet: true,
        hasNotch: false,
      };
      
      expect(iosDevice.platform).toBe('ios');
      expect(iosDevice.hasNotch).toBe(true);
      expect(androidDevice.platform).toBe('android');
      expect(androidDevice.isTablet).toBe(true);
    });
  });
});
