"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
dotenv_1.default.config({ path: '.env.local', override: true });
function required(name, value) {
    if (!value)
        throw new Error(`Missing required env var ${name}`);
    return value;
}
exports.env = {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: Number(process.env.PORT || 3001),
    useHttps: process.env.USE_HTTPS === 'true',
    jwtSecret: required('JWT_SECRET', process.env.JWT_SECRET),
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d',
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    databaseUrl: required('DATABASE_URL', process.env.DATABASE_URL),
};
//# sourceMappingURL=environment.js.map