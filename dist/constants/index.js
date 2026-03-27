"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EXCEL_STYLES = exports.SSE_KEEPALIVE_MS = exports.MAX_DEFECT_CHART_ITEMS = exports.MAX_LOG_PAGE_SIZE = exports.DEFAULT_PAGE_SIZE = exports.VIN_LENGTH = exports.BCRYPT_SALT_ROUNDS = exports.MIN_PASSWORD_LENGTH = exports.VALID_PLANTS = exports.VALID_SCM_DECISIONS = exports.VALID_GRADES = exports.TIMEZONE = exports.ROLE_IDS = void 0;
exports.mapRoleName = mapRoleName;
// ─── Role IDs (must match "Role" table in database) ──────────────────────────
exports.ROLE_IDS = {
    WWS: 1,
    SCM: 2,
    BODY: 3,
    CARRIER: 4,
    ADMIN: 5,
    WTY: 6,
    SCM_QUALITY: 7,
};
/** Map role name string → role ID. Returns null if unknown. */
function mapRoleName(role) {
    if (typeof role === 'number')
        return role;
    if (typeof role === 'string') {
        const entry = Object.entries(exports.ROLE_IDS).find(([key]) => key === role.toUpperCase());
        if (entry)
            return entry[1];
        const asNum = Number(role);
        if (!isNaN(asNum))
            return asNum;
    }
    return null;
}
// ─── Timezone ─────────────────────────────────────────────────────────────────
exports.TIMEZONE = 'America/Mexico_City';
// ─── Validation ───────────────────────────────────────────────────────────────
exports.VALID_GRADES = ['V1', 'V2', 'V3'];
exports.VALID_SCM_DECISIONS = ['LOAD_WITHOUT', 'WAIT', 'REORGANIZE', 'NEW_TRIP'];
exports.VALID_PLANTS = ['A1', 'A2'];
exports.MIN_PASSWORD_LENGTH = 8;
exports.BCRYPT_SALT_ROUNDS = 10;
exports.VIN_LENGTH = 17;
// ─── Pagination defaults ─────────────────────────────────────────────────────
exports.DEFAULT_PAGE_SIZE = 50;
exports.MAX_LOG_PAGE_SIZE = 200;
exports.MAX_DEFECT_CHART_ITEMS = 10;
// ─── SSE / Rate Limits ───────────────────────────────────────────────────────
exports.SSE_KEEPALIVE_MS = 25000;
// ─── Excel export styling ────────────────────────────────────────────────────
exports.EXCEL_STYLES = {
    NISSAN_RED: 'FFC3142D',
    WHITE: 'FFFFFFFF',
    BORDER_COLOR: 'FFB0B0B0',
    ROW_ALT: 'FFFFF0F0',
    ROW_NORMAL: 'FFFFFFFF',
    FONT_NAME: 'Calibri',
    APP_NAME: 'Nissan Body App',
};
//# sourceMappingURL=index.js.map