import dotenv from 'dotenv';

dotenv.config();

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing required env var ${name}`);
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3001),
  db: {
    host: required('DB_HOST', process.env.DB_HOST),
    port: Number(process.env.DB_PORT || 5432),
    database: required('DB_DATABASE', process.env.DB_DATABASE),
    user: required('DB_USER', process.env.DB_USER),
    password: required('DB_PASSWORD', process.env.DB_PASSWORD),
  },
};

export type Env = typeof env;
