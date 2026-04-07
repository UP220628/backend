"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPool = getPool;
const postgres_1 = __importDefault(require("postgres"));
const environment_1 = require("./environment");
const sql = (0, postgres_1.default)(environment_1.env.databaseUrl, {
    ssl: 'require',
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    // Configuración de tipos para preservar timestamps como strings
    transform: {
        undefined: null,
    }
});
exports.default = sql;
// Compatibilidad para código existente que usa getPool()
async function getPool() {
    return {
        // Simula la interfaz .query de pg.Pool
        query: async (text, params) => {
            const rows = await sql.unsafe(text, params ?? []);
            return { rows };
        },
    };
}
//# sourceMappingURL=database.js.map