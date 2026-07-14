export interface Ficha {
  id: string;
  user_id: string;
  nome: string;
  dados: Record<string, unknown>;
  lastEditedBy: string | null;
  campanhaId: string | null;
}

export interface Campanha {
  id: string;
  gmId: string;
  gmEmail: string;
  gmUsername: string | null;
  nome: string;
  descricao: string;
  sistema: string;
  status: string;
  jogadoresIds: string[];
  membros: Record<string, { email: string; username: string | null; joinedAt: unknown }>;
}

export interface UserProfile {
  uid: string;
  email: string;
  username?: string;
  avatarUrl?: string;
}

export interface Solicitacao {
  uid: string;
  email: string;
  fichaId: string;
  fichaName: string;
  requestedAt: unknown;
}
