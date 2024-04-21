import { Pool } from 'pg';

const pool = new Pool({
  user: 'postgres',
  host: 'localhost', 
  database: 'testdb',
  password: 'masterpassword',
  port: 5432,
});

const db = {
    async connect() {
      return await pool.connect();
    },
    async disconnect() {
      await pool.end();
    }
};
  
export default db;