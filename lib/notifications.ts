import { Platform } from 'react-native';
import { apiFetch } from './api';

/**
 * Push-Token (OneSignal Player-ID) an die API senden
 */
export async function registerPushToken(playerId: string) {
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  return apiFetch('/notifications/register', {
    method: 'POST',
    body: JSON.stringify({ player_id: playerId, platform }),
  });
}

/**
 * Push-Token entfernen (z.B. bei Logout)
 */
export async function unregisterPushToken(playerId: string) {
  return apiFetch('/notifications/unregister', {
    method: 'DELETE',
    body: JSON.stringify({ player_id: playerId }),
  });
}
