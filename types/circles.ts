export interface ConnectionProfile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  vip_level: number;
  is_origin_soul: boolean;
}

export interface Connection {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  updated_at: string;
  profile: ConnectionProfile;
}

export type ConnectionStatus = 'none' | 'pending_outgoing' | 'pending_incoming' | 'connected';

export interface ConnectionStatusResponse {
  status: ConnectionStatus;
  connectionId: string | null;
}
