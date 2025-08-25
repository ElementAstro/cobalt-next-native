/**
 * Tests for iconWithClassName utility
 */

import { iconWithClassName } from '../../../lib/icons/iconWithClassName';
import { cssInterop } from 'nativewind';

// Mock nativewind
jest.mock('nativewind', () => ({
  cssInterop: jest.fn(),
}));

// Mock lucide icon with proper React component structure
const mockIcon = jest.fn() as any;
mockIcon.$$typeof = Symbol.for('react.forward_ref');

describe('lib/icons/iconWithClassName', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call cssInterop with correct configuration', () => {
    iconWithClassName(mockIcon);

    expect(cssInterop).toHaveBeenCalledWith(mockIcon, {
      className: {
        target: 'style',
        nativeStyleToProp: {
          color: true,
          opacity: true,
        },
      },
    });
  });

  it('should handle multiple icon calls', () => {
    const icon1 = jest.fn() as any;
    icon1.$$typeof = Symbol.for('react.forward_ref');
    const icon2 = jest.fn() as any;
    icon2.$$typeof = Symbol.for('react.forward_ref');
    const icon3 = jest.fn() as any;
    icon3.$$typeof = Symbol.for('react.forward_ref');

    iconWithClassName(icon1);
    iconWithClassName(icon2);
    iconWithClassName(icon3);

    expect(cssInterop).toHaveBeenCalledTimes(3);
    expect(cssInterop).toHaveBeenNthCalledWith(1, icon1, expect.any(Object));
    expect(cssInterop).toHaveBeenNthCalledWith(2, icon2, expect.any(Object));
    expect(cssInterop).toHaveBeenNthCalledWith(3, icon3, expect.any(Object));
  });

  it('should use consistent configuration for all icons', () => {
    const expectedConfig = {
      className: {
        target: 'style',
        nativeStyleToProp: {
          color: true,
          opacity: true,
        },
      },
    };

    iconWithClassName(mockIcon);

    expect(cssInterop).toHaveBeenCalledWith(mockIcon, expectedConfig);
  });

  it('should handle null or undefined icons gracefully', () => {
    expect(() => {
      iconWithClassName(null as any);
    }).not.toThrow();

    expect(() => {
      iconWithClassName(undefined as any);
    }).not.toThrow();

    expect(cssInterop).toHaveBeenCalledTimes(2);
  });

  it('should preserve icon reference', () => {
    const originalIcon = jest.fn() as any;
    originalIcon.$$typeof = Symbol.for('react.forward_ref');

    iconWithClassName(originalIcon);

    expect(cssInterop).toHaveBeenCalledWith(originalIcon, expect.any(Object));
    // The original icon should be passed through unchanged
    expect((cssInterop as jest.Mock).mock.calls[0][0]).toBe(originalIcon);
  });

  it('should configure only color and opacity properties', () => {
    iconWithClassName(mockIcon);

    const config = (cssInterop as jest.Mock).mock.calls[0][1];
    const nativeStyleToProp = config.className.nativeStyleToProp;

    expect(Object.keys(nativeStyleToProp)).toEqual(['color', 'opacity']);
    expect(nativeStyleToProp.color).toBe(true);
    expect(nativeStyleToProp.opacity).toBe(true);
  });

  it('should target style property', () => {
    iconWithClassName(mockIcon);

    const config = (cssInterop as jest.Mock).mock.calls[0][1];
    expect(config.className.target).toBe('style');
  });

  it('should work with different icon types', () => {
    const functionIcon = (() => null) as any;
    functionIcon.$$typeof = Symbol.for('react.forward_ref');
    const objectIcon = { render: () => null, $$typeof: Symbol.for('react.forward_ref') } as any;
    const classIcon = class Icon {} as any;
    classIcon.$$typeof = Symbol.for('react.forward_ref');

    iconWithClassName(functionIcon);
    iconWithClassName(objectIcon);
    iconWithClassName(classIcon);

    expect(cssInterop).toHaveBeenCalledTimes(3);
    expect(cssInterop).toHaveBeenNthCalledWith(1, functionIcon, expect.any(Object));
    expect(cssInterop).toHaveBeenNthCalledWith(2, objectIcon, expect.any(Object));
    expect(cssInterop).toHaveBeenNthCalledWith(3, classIcon, expect.any(Object));
  });

  it('should handle cssInterop errors gracefully', () => {
    (cssInterop as jest.Mock).mockImplementationOnce(() => {
      throw new Error('cssInterop error');
    });

    expect(() => {
      iconWithClassName(mockIcon);
    }).toThrow('cssInterop error');
  });

  it('should be callable multiple times on same icon', () => {
    iconWithClassName(mockIcon);
    iconWithClassName(mockIcon);
    iconWithClassName(mockIcon);

    expect(cssInterop).toHaveBeenCalledTimes(3);
    expect(cssInterop).toHaveBeenCalledWith(mockIcon, expect.any(Object));
  });
});
