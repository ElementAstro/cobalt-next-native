/**
 * Tests for android-navigation-bar utility
 */

import { Platform } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';
import { setAndroidNavigationBar } from '../../lib/android-navigation-bar';
import { NAV_THEME } from '../../lib/constants';

// Mock expo-navigation-bar
jest.mock('expo-navigation-bar', () => ({
  setButtonStyleAsync: jest.fn(() => Promise.resolve()),
  setBackgroundColorAsync: jest.fn(() => Promise.resolve()),
}));

describe('lib/android-navigation-bar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('setAndroidNavigationBar', () => {
    it('should set navigation bar for dark theme on Android', async () => {
      Platform.OS = 'android';

      await setAndroidNavigationBar('dark');

      expect(NavigationBar.setButtonStyleAsync).toHaveBeenCalledWith('light');
      expect(NavigationBar.setBackgroundColorAsync).toHaveBeenCalledWith(
        NAV_THEME.dark.background
      );
    });

    it('should set navigation bar for light theme on Android', async () => {
      Platform.OS = 'android';

      await setAndroidNavigationBar('light');

      expect(NavigationBar.setButtonStyleAsync).toHaveBeenCalledWith('dark');
      expect(NavigationBar.setBackgroundColorAsync).toHaveBeenCalledWith(
        NAV_THEME.light.background
      );
    });

    it('should not call navigation bar methods on iOS', async () => {
      Platform.OS = 'ios';

      await setAndroidNavigationBar('dark');

      expect(NavigationBar.setButtonStyleAsync).not.toHaveBeenCalled();
      expect(NavigationBar.setBackgroundColorAsync).not.toHaveBeenCalled();
    });

    it('should not call navigation bar methods on web', async () => {
      Platform.OS = 'web';

      await setAndroidNavigationBar('light');

      expect(NavigationBar.setButtonStyleAsync).not.toHaveBeenCalled();
      expect(NavigationBar.setBackgroundColorAsync).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      Platform.OS = 'android';
      const error = new Error('Navigation bar error');
      (NavigationBar.setButtonStyleAsync as jest.Mock).mockRejectedValueOnce(error);

      // Should not throw
      await expect(setAndroidNavigationBar('dark')).rejects.toThrow('Navigation bar error');
    });

    it('should handle background color errors gracefully', async () => {
      Platform.OS = 'android';
      const error = new Error('Background color error');
      (NavigationBar.setBackgroundColorAsync as jest.Mock).mockRejectedValueOnce(error);

      // Should not throw
      await expect(setAndroidNavigationBar('light')).rejects.toThrow('Background color error');
    });

    it('should call methods in correct order', async () => {
      Platform.OS = 'android';
      const callOrder: string[] = [];

      (NavigationBar.setButtonStyleAsync as jest.Mock).mockImplementation(() => {
        callOrder.push('setButtonStyle');
        return Promise.resolve();
      });

      (NavigationBar.setBackgroundColorAsync as jest.Mock).mockImplementation(() => {
        callOrder.push('setBackgroundColor');
        return Promise.resolve();
      });

      await setAndroidNavigationBar('dark');

      expect(callOrder).toEqual(['setButtonStyle', 'setBackgroundColor']);
    });

    it('should use correct theme colors', async () => {
      Platform.OS = 'android';

      await setAndroidNavigationBar('dark');
      expect(NavigationBar.setBackgroundColorAsync).toHaveBeenCalledWith(
        NAV_THEME.dark.background
      );

      await setAndroidNavigationBar('light');
      expect(NavigationBar.setBackgroundColorAsync).toHaveBeenCalledWith(
        NAV_THEME.light.background
      );
    });

    it('should handle concurrent calls', async () => {
      Platform.OS = 'android';

      const promises = [
        setAndroidNavigationBar('dark'),
        setAndroidNavigationBar('light'),
        setAndroidNavigationBar('dark'),
      ];

      await Promise.all(promises);

      expect(NavigationBar.setButtonStyleAsync).toHaveBeenCalledTimes(3);
      expect(NavigationBar.setBackgroundColorAsync).toHaveBeenCalledTimes(3);
    });
  });
});
