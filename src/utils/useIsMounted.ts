import { useRef } from 'react';
import useMount from './useMount';
import useUnmount from './useUnmount';

export function useIsMounted() {
  const isMounted = useRef(false);

  useMount(() => {
    isMounted.current = true;
  });

  useUnmount(() => {
    isMounted.current = false;
  });

  return isMounted;
}
