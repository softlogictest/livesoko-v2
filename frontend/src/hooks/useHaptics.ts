import { useCallback } from 'react';

export const useHaptics = () => {
  const pulse = useCallback(() => {
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
  }, []);

  const alert = useCallback(() => {
    if (navigator.vibrate) navigator.vibrate(600);
  }, []);

  return { pulse, alert };
};
