import { useSyncExternalStore } from 'react';
import { isUpdateReady, subscribeToUpdate } from '@infrastructure/pwa';

/** True once a newer web build is installed and waits for the operator's go-ahead. */
export function useAppUpdate(): boolean {
  return useSyncExternalStore(subscribeToUpdate, isUpdateReady, () => false);
}
