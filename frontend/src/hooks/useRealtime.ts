import { useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { useHaptics } from './useHaptics';
import { useAudio } from './useAudio';
import { API } from '../App';

export const useRealtime = () => {
  const { state, dispatch } = useAppContext();
  const { pulse, alert: vibrateAlert } = useHaptics();
  const { playSound } = useAudio();
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!state.user?.token || !state.activeShop?.id) return;

    // Connect to SSE endpoint with token and current shop context
    const sseUrl = `${API}/api/events?token=${state.user.token}&shop_id=${state.activeShop.id}`;
    const es = new EventSource(sseUrl);
    eventSourceRef.current = es;

    es.addEventListener('order:new', (e) => {
      const order = JSON.parse(e.data);
      dispatch({ type: 'ADD_ORDER', payload: order });
    });

    es.addEventListener('order:updated', (e) => {
      const order = JSON.parse(e.data);
      dispatch({ type: 'UPDATE_ORDER', payload: order });

      // Haptics & Audio based on status
      if (order.status === 'VERIFIED') {
        pulse();
        playSound('success');
      } else if (order.status === 'FRAUD') {
        vibrateAlert();
      }
    });

    es.addEventListener('order:deleted', (e) => {
      const { id } = JSON.parse(e.data);
      dispatch({ type: 'DELETE_ORDER', payload: { id } });
    });
    
    es.addEventListener('payment:unmatched', (e) => {
      const payment = JSON.parse(e.data);
      dispatch({ type: 'ADD_UNMATCHED_PAYMENT', payload: payment });
      vibrateAlert(); // Strong vibration for floating money
      playSound('alert');
    });

    es.addEventListener('payment:linked', (e) => {
      const { id } = JSON.parse(e.data);
      dispatch({ type: 'REMOVE_UNMATCHED_PAYMENT', payload: id });
    });

    es.addEventListener('connected', () => {
      console.log('🔌 Realtime connected via SSE');
    });

    es.onerror = () => {
      console.warn('SSE connection lost, auto-reconnecting...');
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, state.user?.token, state.activeShop?.id]);
};
