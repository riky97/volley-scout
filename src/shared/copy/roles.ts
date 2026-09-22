import type { PlayerRole } from '@domain/entities/player';

/** Italian label for every `PlayerRole` (docs/03-ux-flows.md §3.3, "Ruolo options"). */
export const PLAYER_ROLE_LABELS: Record<PlayerRole, string> = {
  setter: 'Palleggiatore',
  outside: 'Schiacciatore',
  opposite: 'Opposto',
  middle: 'Centrale',
  libero: 'Libero',
  unknown: 'Non specificato',
};
