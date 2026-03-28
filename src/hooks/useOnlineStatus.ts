import { useState, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

const CHECK_URL = 'https://captive.apple.com/hotspot-detect.html';
const POLL_INTERVAL_MS = 10_000; // recheck every 10s while app is active

async function checkConnectivity(): Promise<boolean> {
  try {
    const res = await fetch(CHECK_URL, { method: 'HEAD', cache: 'no-store' });
    return res.ok;
  } catch {
    return false;
  }
}

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const check = async () => {
    const online = await checkConnectivity();
    setIsOnline(online);
  };

  useEffect(() => {
    check();

    timerRef.current = setInterval(check, POLL_INTERVAL_MS);

    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        check();
      }
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      sub.remove();
    };
  }, []);

  return isOnline;
}
