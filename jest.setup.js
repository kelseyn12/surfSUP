/**
 * Jest setup file — runs once before each test file.
 * Add shared mocks for native modules here as they come up.
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
