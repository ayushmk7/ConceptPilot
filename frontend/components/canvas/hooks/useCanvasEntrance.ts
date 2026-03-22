import { useCallback, useRef, useState, useEffect } from 'react';
import type { ReactFlowInstance } from '@xyflow/react';

export function useCanvasEntrance() {
  const [entranceClass, setEntranceClass] = useState('canvas-entrance-start canvas-entrance');
  const hasPlayedRef = useRef(false);

  const onInit = useCallback((_instance: ReactFlowInstance) => {
    if (hasPlayedRef.current) return;
    hasPlayedRef.current = true;

    // First frame: remove the 'start' class to trigger the CSS transition
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setEntranceClass('canvas-entrance');
        
        // After transition completes (0.8s), remove the transition class entirely
        // so dragging interactions are instantaneous again.
        setTimeout(() => {
          setEntranceClass('');
        }, 1000);
      });
    });
  }, []);

  return { entranceClass, onInit };
}
