import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not defined');
}

const sql = postgres(connectionString, {
  ssl: 'require',
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  // Configuración de tipos para preservar timestamps como strings
  transform: {
    undefined: null,
  }
} as any);

export default sql;

// Compatibilidad para código existente que usa getPool()
export async function getPool() {
  return {
    // Simula la interfaz .query de pg.Pool
    query: async (text: string, params?: any[]) => {
      const rows = await sql.unsafe(text, params ?? []);
      return { rows };
    },
  } as any;
}
