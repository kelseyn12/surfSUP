import { useAuthStore } from './auth';
import { firebaseAuth } from '../config/firebase';
import { getIdToken, updateProfile, onAuthStateChanged, reload } from '@react-native-firebase/auth';
import { setUserContext } from './sentry';
import { firestoreGetActiveCheckInAnywhere, firestoreCheckOutFromSpot } from './firestore';
import { SocialAuthService } from './socialAuth';

// ─── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('../config/firebase', () => ({
  firebaseAuth: {
    signInWithEmailAndPassword: jest.fn(),
    createUserWithEmailAndPassword: jest.fn(),
    signOut: jest.fn(),
    currentUser: null,
  },
}));

jest.mock('@react-native-firebase/auth', () => ({
  getIdToken: jest.fn(),
  updateProfile: jest.fn(),
  onAuthStateChanged: jest.fn(),
  reload: jest.fn(),
}));

jest.mock('./sentry', () => ({
  setUserContext: jest.fn(),
}));

jest.mock('./firestore', () => ({
  firestoreGetActiveCheckInAnywhere: jest.fn(),
  firestoreCheckOutFromSpot: jest.fn(),
}));

jest.mock('./socialAuth', () => ({
  SocialAuthService: {
    signInWithApple: jest.fn(),
    signInWithGoogle: jest.fn(),
  },
}));

// Helper to build a fake Firebase user matching what convertFirebaseUser expects
const makeFirebaseUser = (overrides: Partial<Record<string, any>> = {}) => ({
  uid: 'uid-123',
  email: 'test@example.com',
  displayName: 'Test User',
  photoURL: null,
  metadata: { creationTime: '2026-01-01T00:00:00.000Z' },
  ...overrides,
});

describe('Auth Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      loginAttempts: 0,
      lastLoginAttempt: 0,
    });
  });

  describe('Login', () => {
    it('should successfully log in a user', async () => {
      const fbUser = makeFirebaseUser();
      (firebaseAuth.signInWithEmailAndPassword as jest.Mock).mockResolvedValueOnce({ user: fbUser });
      (getIdToken as jest.Mock).mockResolvedValueOnce('mock-id-token');

      await useAuthStore.getState().login('test@example.com', 'password123');

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user?.email).toBe('test@example.com');
      expect(state.token).toBe('mock-id-token');
      expect(state.loginAttempts).toBe(0);
    });

    it('should record a failed login attempt with an error message', async () => {
      (firebaseAuth.signInWithEmailAndPassword as jest.Mock).mockRejectedValueOnce(
        new Error('Invalid credentials')
      );

      await useAuthStore.getState().login('test@example.com', 'wrongpassword');

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBe('Invalid credentials');
      expect(state.loginAttempts).toBe(1);
    });

    it('should increment loginAttempts across repeated failures', async () => {
      (firebaseAuth.signInWithEmailAndPassword as jest.Mock).mockRejectedValue(
        new Error('Invalid credentials')
      );

      await useAuthStore.getState().login('test@example.com', 'wrong1');
      await useAuthStore.getState().login('test@example.com', 'wrong2');

      expect(useAuthStore.getState().loginAttempts).toBe(2);
    });
  });

  describe('Registration', () => {
    it('should reject a weak password before calling Firebase', async () => {
      await useAuthStore.getState().register('test@example.com', 'weak', 'Test User');

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBe('Password does not meet security requirements');
      expect(firebaseAuth.createUserWithEmailAndPassword).not.toHaveBeenCalled();
    });

    it('should successfully register with a strong password', async () => {
      const fbUser = makeFirebaseUser();
      (firebaseAuth.createUserWithEmailAndPassword as jest.Mock).mockResolvedValueOnce({ user: fbUser });
      (updateProfile as jest.Mock).mockResolvedValueOnce(undefined);
      (getIdToken as jest.Mock).mockResolvedValueOnce('mock-id-token');

      await useAuthStore.getState().register('test@example.com', 'Str0ng!Pass', 'Test User');

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user?.email).toBe('test@example.com');
      expect(updateProfile).toHaveBeenCalledWith(fbUser, { displayName: 'Test User' });
    });

    it('should surface a Firebase registration error', async () => {
      (firebaseAuth.createUserWithEmailAndPassword as jest.Mock).mockRejectedValueOnce(
        new Error('Email already registered')
      );

      await useAuthStore.getState().register('test@example.com', 'Str0ng!Pass', 'Test User');

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBe('Email already registered');
    });
  });

  describe('Logout', () => {
    it('should auto-checkout an active check-in, then sign out', async () => {
      useAuthStore.setState({
        user: { id: 'user-1', email: 'a@b.com', name: 'A', createdAt: '' },
        isAuthenticated: true,
      });
      (firestoreGetActiveCheckInAnywhere as jest.Mock).mockResolvedValueOnce({ id: 'checkin-1' });
      (firestoreCheckOutFromSpot as jest.Mock).mockResolvedValueOnce(true);
      (firebaseAuth.signOut as jest.Mock).mockResolvedValueOnce(undefined);

      await useAuthStore.getState().logout();

      expect(firestoreGetActiveCheckInAnywhere).toHaveBeenCalledWith('user-1');
      expect(firestoreCheckOutFromSpot).toHaveBeenCalledWith('checkin-1');
      expect(firebaseAuth.signOut).toHaveBeenCalled();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it('should still sign out even if auto-checkout fails', async () => {
      useAuthStore.setState({
        user: { id: 'user-1', email: 'a@b.com', name: 'A', createdAt: '' },
        isAuthenticated: true,
      });
      (firestoreGetActiveCheckInAnywhere as jest.Mock).mockRejectedValueOnce(new Error('network error'));
      (firebaseAuth.signOut as jest.Mock).mockResolvedValueOnce(undefined);

      await useAuthStore.getState().logout();

      expect(firebaseAuth.signOut).toHaveBeenCalled();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it('should skip checkout entirely when there is no logged-in user', async () => {
      (firebaseAuth.signOut as jest.Mock).mockResolvedValueOnce(undefined);

      await useAuthStore.getState().logout();

      expect(firestoreGetActiveCheckInAnywhere).not.toHaveBeenCalled();
      expect(firebaseAuth.signOut).toHaveBeenCalled();
    });

    it('should record an error if signOut itself fails', async () => {
      (firebaseAuth.signOut as jest.Mock).mockRejectedValueOnce(new Error('Sign out failed'));

      await useAuthStore.getState().logout();

      expect(useAuthStore.getState().error).toBe('Sign out failed');
    });
  });

  describe('refreshAuthToken', () => {
    it('should refresh the token for the current Firebase user', async () => {
      (firebaseAuth as any).currentUser = { uid: 'uid-123' };
      (getIdToken as jest.Mock).mockResolvedValueOnce('refreshed-token');

      await useAuthStore.getState().refreshAuthToken();

      expect(getIdToken).toHaveBeenCalledWith({ uid: 'uid-123' }, true);
      expect(useAuthStore.getState().token).toBe('refreshed-token');
    });

    it('should do nothing when there is no current Firebase user', async () => {
      (firebaseAuth as any).currentUser = null;

      await useAuthStore.getState().refreshAuthToken();

      expect(getIdToken).not.toHaveBeenCalled();
    });
  });

  describe('initializeAuth', () => {
    it('should set user state and call setUserContext when Firebase reports a signed-in user', async () => {
      let capturedCallback: (user: any) => void = () => {};
      (onAuthStateChanged as jest.Mock).mockImplementation((_auth, cb) => {
        capturedCallback = cb;
        return jest.fn(); // unsubscribe
      });
      (getIdToken as jest.Mock).mockResolvedValueOnce('mock-id-token');

      const cleanup = useAuthStore.getState().initializeAuth();
      await capturedCallback(makeFirebaseUser());
      // allow the async callback's microtasks to flush
      await Promise.resolve();

      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(setUserContext).toHaveBeenCalledWith('uid-123');

      cleanup(); // clears the internal refresh-token setInterval
    });

    it('should clear state and call setUserContext(null) when Firebase reports signed-out', async () => {
      let capturedCallback: (user: any) => void = () => {};
      (onAuthStateChanged as jest.Mock).mockImplementation((_auth, cb) => {
        capturedCallback = cb;
        return jest.fn();
      });

      const cleanup = useAuthStore.getState().initializeAuth();
      await capturedCallback(null);

      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(setUserContext).toHaveBeenCalledWith(null);

      cleanup();
    });
  });

  describe('clearError / updateLastActivity', () => {
    it('clearError should reset the error field to null', () => {
      useAuthStore.setState({ error: 'some error' });
      useAuthStore.getState().clearError();
      expect(useAuthStore.getState().error).toBeNull();
    });

    it('updateLastActivity should bump lastActivity to a more recent timestamp', () => {
      useAuthStore.setState({ lastActivity: 0 });
      useAuthStore.getState().updateLastActivity();
      expect(useAuthStore.getState().lastActivity).toBeGreaterThan(0);
    });
  });

  describe('Social sign-in', () => {
    it('signInWithApple should sign the user in on success', async () => {
      const fbUser = makeFirebaseUser();
      (SocialAuthService.signInWithApple as jest.Mock).mockResolvedValueOnce({
        success: true,
        user: fbUser,
        userData: { name: 'Apple User' },
      });
      (reload as jest.Mock).mockResolvedValueOnce(undefined);
      (getIdToken as jest.Mock).mockResolvedValueOnce('apple-token');

      await useAuthStore.getState().signInWithApple();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user?.name).toBe('Apple User');
    });

    it('signInWithGoogle should record an error on failure', async () => {
      (SocialAuthService.signInWithGoogle as jest.Mock).mockResolvedValueOnce({
        success: false,
        error: 'Google sign-in cancelled',
      });

      await useAuthStore.getState().signInWithGoogle();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBe('Google sign-in cancelled');
    });
  });
});
