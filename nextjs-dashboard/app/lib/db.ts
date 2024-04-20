import { Pool } from 'pg';

export const pool = new Pool({
    user: 'postgres',
    host: 'localhost/', 
    database: 'mydb',
    // password: '',
    port: 5432,
});

module.exports = pool;