import { useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { useHaptics } from './useHaptics';
import { API } from '../App';

export const useRealtime = () => {
  const { dispatch } = useAppContext();
  const { pulse, alert } = useHaptics();
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // Connect to SSE endpoint
    const sseUrl = `${API}/api/events`;
    const es = new EventSource(sseUrl);
    eventSourceRef.current = es;

    es.addEventListener('order:new', (e) => {
      const order = JSON.parse(e.data);
      dispatch({ type: 'ADD_ORDER', payload: order });
    });

    es.addEventListener('order:updated', (e) => {
      const order = JSON.parse(e.data);
      dispatch({ type: 'UPDATE_ORDER', payload: order });

      // Haptics based on status
      if (order.status === 'VERIFIED') pulse();
      else if (order.status === 'FRAUD') alert();
    });

    es.addEventListener('order:deleted', (e) => {
      const { id } = JSON.parse(e.data);
      dispatch({ type: 'DELETE_ORDER', payload: { id } });
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
  }, [dispatch, pulse, alert]);
};
