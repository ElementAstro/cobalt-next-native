import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { useColorScheme } from '../../lib/useColorScheme';

// Mock nativewind
const mockSetColorScheme = jest.fn();
const mockToggleColorScheme = jest.fn();

jest.mock('nativewind', () => ({
  useColorScheme: jest.fn(() => ({
    colorScheme: 'light',
    setColorScheme: mockSetColorScheme,
    toggleColorScheme: mockToggleColorScheme,
  })),
}));

describe('lib/useColorScheme', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useColorScheme hook', () => {
    it('should return default values when colorScheme is null', () => {
      const mockUseColorScheme = require('nativewind').useColorScheme;
      mockUseColorScheme.mockReturnValue({
        colorScheme: null,
        setColorScheme: mockSetColorScheme,
        toggleColorScheme: mockToggleColorScheme,
      });

      const { result } = renderHook(() => useColorScheme());

      expect(result.current.colorScheme).toBe('dark');
      expect(result.current.isDarkColorScheme).toBe(true);
      expect(result.current.setColorScheme).toBe(mockSetColorScheme);
      expect(result.current.toggleColorScheme).toBe(mockToggleColorScheme);
    });

    it('should return light theme values', () => {
      const mockUseColorScheme = require('nativewind').useColorScheme;
      mockUseColorScheme.mockReturnValue({
        colorScheme: 'light',
        setColorScheme: mockSetColorScheme,
        toggleColorScheme: mockToggleColorScheme,
      });

      const { result } = renderHook(() => useColorScheme());

      expect(result.current.colorScheme).toBe('light');
      expect(result.current.isDarkColorScheme).toBe(false);
      expect(result.current.setColorScheme).toBe(mockSetColorScheme);
      expect(result.current.toggleColorScheme).toBe(mockToggleColorScheme);
    });

    it('should return dark theme values', () => {
      const mockUseColorScheme = require('nativewind').useColorScheme;
      mockUseColorScheme.mockReturnValue({
        colorScheme: 'dark',
        setColorScheme: mockSetColorScheme,
        toggleColorScheme: mockToggleColorScheme,
      });

      const { result } = renderHook(() => useColorScheme());

      expect(result.current.colorScheme).toBe('dark');
      expect(result.current.isDarkColorScheme).toBe(true);
      expect(result.current.setColorScheme).toBe(mockSetColorScheme);
      expect(result.current.toggleColorScheme).toBe(mockToggleColorScheme);
    });

    it('should handle undefined colorScheme', () => {
      const mockUseColorScheme = require('nativewind').useColorScheme;
      mockUseColorScheme.mockReturnValue({
        colorScheme: undefined,
        setColorScheme: mockSetColorScheme,
        toggleColorScheme: mockToggleColorScheme,
      });

      const { result } = renderHook(() => useColorScheme());

      expect(result.current.colorScheme).toBe('dark');
      expect(result.current.isDarkColorScheme).toBe(true);
    });

    it('should correctly identify dark color scheme', () => {
      const testCases = [
        { input: 'dark', expected: true },
        { input: 'light', expected: false },
        { input: null, expected: true }, // defaults to dark
        { input: undefined, expected: true }, // defaults to dark
      ];

      testCases.forEach(({ input, expected }) => {
        const mockUseColorScheme = require('nativewind').useColorScheme;
        mockUseColorScheme.mockReturnValue({
          colorScheme: input,
          setColorScheme: mockSetColorScheme,
          toggleColorScheme: mockToggleColorScheme,
        });

        const { result } = renderHook(() => useColorScheme());
        expect(result.current.isDarkColorScheme).toBe(expected);
      });
    });

    it('should pass through setColorScheme function', () => {
      const mockUseColorScheme = require('nativewind').useColorScheme;
      mockUseColorScheme.mockReturnValue({
        colorScheme: 'light',
        setColorScheme: mockSetColorScheme,
        toggleColorScheme: mockToggleColorScheme,
      });

      const { result } = renderHook(() => useColorScheme());

      act(() => {
        result.current.setColorScheme('dark');
      });

      expect(mockSetColorScheme).toHaveBeenCalledWith('dark');
    });

    it('should pass through toggleColorScheme function', () => {
      const mockUseColorScheme = require('nativewind').useColorScheme;
      mockUseColorScheme.mockReturnValue({
        colorScheme: 'light',
        setColorScheme: mockSetColorScheme,
        toggleColorScheme: mockToggleColorScheme,
      });

      const { result } = renderHook(() => useColorScheme());

      act(() => {
        result.current.toggleColorScheme();
      });

      expect(mockToggleColorScheme).toHaveBeenCalled();
    });

    it('should maintain referential stability', () => {
      const mockUseColorScheme = require('nativewind').useColorScheme;
      mockUseColorScheme.mockReturnValue({
        colorScheme: 'light',
        setColorScheme: mockSetColorScheme,
        toggleColorScheme: mockToggleColorScheme,
      });

      const { result, rerender } = renderHook(() => useColorScheme());

      const firstRender = {
        setColorScheme: result.current.setColorScheme,
        toggleColorScheme: result.current.toggleColorScheme,
      };

      rerender({});

      expect(result.current.setColorScheme).toBe(firstRender.setColorScheme);
      expect(result.current.toggleColorScheme).toBe(firstRender.toggleColorScheme);
    });

    it('should handle rapid theme changes', () => {
      const mockUseColorScheme = require('nativewind').useColorScheme;
      let currentScheme = 'light';

      mockUseColorScheme.mockImplementation(() => ({
        colorScheme: currentScheme,
        setColorScheme: (scheme: string) => {
          currentScheme = scheme;
        },
        toggleColorScheme: () => {
          currentScheme = currentScheme === 'light' ? 'dark' : 'light';
        },
      }));

      const { result, rerender } = renderHook(() => useColorScheme());

      expect(result.current.colorScheme).toBe('light');
      expect(result.current.isDarkColorScheme).toBe(false);

      // Simulate theme change
      currentScheme = 'dark';
      rerender({});

      expect(result.current.colorScheme).toBe('dark');
      expect(result.current.isDarkColorScheme).toBe(true);
    });
  });
});
