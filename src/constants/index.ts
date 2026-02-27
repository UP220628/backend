// ─── Role IDs (must match "Role" table in database) ──────────────────────────
export const ROLE_IDS = {
  WWS: 1,
  SCM: 2,
  BODY: 3,
  CARRIER: 4,
  ADMIN: 5,
  VQA: 6,
} as const;

export type RoleId = (typeof ROLE_IDS)[keyof typeof ROLE_IDS];

/** Map role name string → role ID. Returns null if unknown. */
export function mapRoleName(role: string | number): number | null {
  if (typeof role === 'number') return role;
  if (typeof role === 'string') {
    const entry = Object.entries(ROLE_IDS).find(
      ([key]) => key === role.toUpperCase()
    );
    if (entry) return entry[1];
    const asNum = Number(role);
    if (!isNaN(asNum)) return asNum;
  }
  return null;
}

// ─── Timezone ─────────────────────────────────────────────────────────────────
export const TIMEZONE = 'America/Mexico_City';

// ─── Validation ───────────────────────────────────────────────────────────────
export const VALID_GRADES = ['V1', 'V2', 'V3'] as const;
export type Grade = (typeof VALID_GRADES)[number];

export const VALID_SCM_DECISIONS = ['LOAD_WITHOUT', 'WAIT', 'REORGANIZE', 'NEW_TRIP'] as const;
export type ScmDecision = (typeof VALID_SCM_DECISIONS)[number];

export const VALID_PLANTS = ['A1', 'A2'] as const;
export type Plant = (typeof VALID_PLANTS)[number];

export const MIN_PASSWORD_LENGTH = 8;
export const BCRYPT_SALT_ROUNDS = 10;
export const VIN_LENGTH = 17;

// ─── Pagination defaults ─────────────────────────────────────────────────────
export const DEFAULT_PAGE_SIZE = 50;
export const MAX_LOG_PAGE_SIZE = 200;
export const MAX_DEFECT_CHART_ITEMS = 10;

// ─── SSE / Rate Limits ───────────────────────────────────────────────────────
export const SSE_KEEPALIVE_MS = 25_000;

// ─── Excel export styling ────────────────────────────────────────────────────
export const EXCEL_STYLES = {
  NISSAN_RED: 'FFC3142D',
  WHITE: 'FFFFFFFF',
  BORDER_COLOR: 'FFB0B0B0',
  ROW_ALT: 'FFFFF0F0',
  ROW_NORMAL: 'FFFFFFFF',
  FONT_NAME: 'Calibri',
  APP_NAME: 'Nissan Body App',
} as const;
