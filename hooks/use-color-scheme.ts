import { useAppStore } from '@/store';

export function useColorScheme(): 'light' | 'dark' {
  return useAppStore((state) => state.theme);
}
