import { cn } from '../../lib/utils';

describe('lib/utils', () => {
  describe('cn function', () => {
    it('should merge class names correctly', () => {
      const result = cn('base-class', 'additional-class');
      expect(result).toBe('base-class additional-class');
    });

    it('should handle conditional classes', () => {
      const result = cn('base-class', true && 'conditional-class', false && 'hidden-class');
      expect(result).toBe('base-class conditional-class');
    });

    it('should handle undefined and null values', () => {
      const result = cn('base-class', undefined, null, 'valid-class');
      expect(result).toBe('base-class valid-class');
    });

    it('should handle empty strings', () => {
      const result = cn('base-class', '', 'valid-class');
      expect(result).toBe('base-class valid-class');
    });

    it('should handle arrays of classes', () => {
      const result = cn(['class1', 'class2'], 'class3');
      expect(result).toBe('class1 class2 class3');
    });

    it('should handle objects with boolean values', () => {
      const result = cn({
        'active': true,
        'disabled': false,
        'highlighted': true,
      });
      expect(result).toBe('active highlighted');
    });

    it('should merge Tailwind classes correctly (deduplication)', () => {
      // This tests the twMerge functionality
      const result = cn('p-4 p-2', 'bg-red-500 bg-blue-500');
      // twMerge should keep the last conflicting class
      expect(result).toContain('p-2');
      expect(result).toContain('bg-blue-500');
      expect(result).not.toContain('p-4');
      expect(result).not.toContain('bg-red-500');
    });

    it('should handle complex combinations with primary variant', () => {
      const isActive = true;
      const isDisabled = false;
      const variant = 'primary';

      const getVariantClass = (v: string) => {
        if (v === 'primary') return 'btn-primary';
        if (v === 'secondary') return 'btn-secondary';
        return '';
      };

      const result = cn(
        'base-button',
        {
          'active': isActive,
          'disabled': isDisabled,
        },
        getVariantClass(variant)
      );

      expect(result).toBe('base-button active btn-primary');
    });

    it('should handle complex combinations with secondary variant', () => {
      const isActive = false;
      const isDisabled = true;
      const variant = 'secondary';

      const getVariantClass = (v: string) => {
        if (v === 'primary') return 'btn-primary';
        if (v === 'secondary') return 'btn-secondary';
        return '';
      };

      const result = cn(
        'base-button',
        {
          'active': isActive,
          'disabled': isDisabled,
        },
        getVariantClass(variant)
      );

      expect(result).toBe('base-button disabled btn-secondary');
    });

    it('should handle no arguments', () => {
      const result = cn();
      expect(result).toBe('');
    });

    it('should handle only falsy values', () => {
      const result = cn(false, null, undefined, '');
      expect(result).toBe('');
    });

    it('should preserve spacing in class names', () => {
      const result = cn('flex items-center', 'justify-between');
      expect(result).toBe('flex items-center justify-between');
    });

    it('should handle nested arrays and objects', () => {
      const result = cn(
        'base',
        ['nested', ['deeply-nested']],
        {
          'conditional': true,
          'hidden': false,
        }
      );
      expect(result).toBe('base nested deeply-nested conditional');
    });

    // Edge cases
    it('should handle very long class strings', () => {
      const longClass = 'a'.repeat(1000);
      const result = cn(longClass, 'short');
      expect(result).toContain(longClass);
      expect(result).toContain('short');
    });

    it('should handle special characters in class names', () => {
      const result = cn('class-with-dashes', 'class_with_underscores', 'class:with:colons');
      expect(result).toBe('class-with-dashes class_with_underscores class:with:colons');
    });

    it('should be performant with many arguments', () => {
      const start = performance.now();
      const args = Array(100).fill('test-class');
      cn(...args);
      const end = performance.now();
      
      // Should complete in reasonable time (less than 10ms)
      expect(end - start).toBeLessThan(10);
    });
  });
});
