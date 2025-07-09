import { useAuthStore } from './auth.js';
import { api } from './api.js';

// Mock the API
jest.mock('./api', () => ({
  api: {
    post: jest.fn(),
  },
}));

describe('Auth Service', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    // Reset the auth store
    useAuthStore.getState().logout();
  });

  describe('Registration', () => {
    it('should successfully register a new user', async () => {
      const mockResponse = {
        data: {
          user: {
            id: '1',
            email: 'test@example.com',
            name: 'Test User',
            createdAt: new Date().toISOString(),
          },
          token: 'mock-token',
          refreshToken: 'mock-refresh-token',
        },
      };

      (api.post as jest.Mock).mockResolvedValueOnce(mockResponse);

      await useAuthStore.getState().register('test@example.com', 'password123', 'Test User');

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user?.email).toBe('test@example.com');
      expect(state.token).toBe('mock-token');
      expect(state.refreshToken).toBe('mock-refresh-token');
    });

    it('should handle registration errors', async () => {
      (api.post as jest.Mock).mockRejectedValueOnce(new Error('Email already registered'));

      await useAuthStore.getState().register('test@example.com', 'password123', 'Test User');

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBe('Email already registered');
    });
  });

  describe('Login', () => {
    it('should successfully login a user', async () => {
      const mockResponse = {
        data: {
          user: {
            id: '1',
            email: 'test@example.com',
            name: 'Test User',
            createdAt: new Date().toISOString(),
          },
          token: 'mock-token',
          refreshToken: 'mock-refresh-token',
        },
      };

      (api.post as jest.Mock).mockResolvedValueOnce(mockResponse);

      await useAuthStore.getState().login('test@example.com', 'password123');

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user?.email).toBe('test@example.com');
      expect(state.token).toBe('mock-token');
      expect(state.refreshToken).toBe('mock-refresh-token');
    });

    it('should handle invalid credentials', async () => {
      (api.post as jest.Mock).mockRejectedValueOnce(new Error('401'));

      await useAuthStore.getState().login('test@example.com', 'wrongpassword');

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBe('Invalid email or password');
    });
  });

  describe('Token Refresh', () => {
    it('should successfully refresh the token', async () => {
      const mockResponse = {
        data: {
          token: 'new-mock-token',
          refreshToken: 'new-mock-refresh-token',
        },
      };

      (api.post as jest.Mock).mockResolvedValueOnce(mockResponse);

      // First login to get initial tokens
      await useAuthStore.getState().login('test@example.com', 'password123');
      
      // Then refresh token
      await useAuthStore.getState().refreshAuthToken();

      const state = useAuthStore.getState();
      expect(state.token).toBe('new-mock-token');
      expect(state.refreshToken).toBe('new-mock-refresh-token');
    });

    it('should logout user if token refresh fails', async () => {
      // First login to get initial tokens
      await useAuthStore.getState().login('test@example.com', 'password123');
      
      // Then fail token refresh
      (api.post as jest.Mock).mockRejectedValueOnce(new Error('Refresh failed'));
      await useAuthStore.getState().refreshAuthToken();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.token).toBeNull();
      expect(state.refreshToken).toBeNull();
    });
  });

  describe('Session Timeout', () => {
    it('should logout user after session timeout', async () => {
      // First login
      await useAuthStore.getState().login('test@example.com', 'password123');
      
      // Simulate session timeout by setting lastActivity to a time before the timeout
      const timeout = 24 * 60 * 60 * 1000; // 24 hours
      useAuthStore.getState().lastActivity = Date.now() - timeout - 1;
      
      // Update last activity which should trigger logout
      useAuthStore.getState().updateLastActivity();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.token).toBeNull();
      expect(state.refreshToken).toBeNull();
    });

    it('should not logout user if within session timeout', async () => {
      // First login
      await useAuthStore.getState().login('test@example.com', 'password123');
      
      // Update last activity within timeout period
      useAuthStore.getState().updateLastActivity();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.token).not.toBeNull();
      expect(state.refreshToken).not.toBeNull();
    });
  });

  describe('Logout', () => {
    it('should successfully logout user', async () => {
      // First login
      await useAuthStore.getState().login('test@example.com', 'password123');
      
      // Then logout
      await useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.refreshToken).toBeNull();
    });
  });
}); 