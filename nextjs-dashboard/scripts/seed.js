const { db } = require('@vercel/postgres');
const { Pool } = require('pg');
const { invoices, customers, revenue, users } = require('../app/lib/placeholder-data.js');
const bcrypt = require('bcrypt');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost', 
  database: 'testdb',
  password: 'masterpassword',
  port: 5432,
});

async function seedUsers(client) {
  try {
    await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    // ... rest of your code

    // Create the "users" table if it doesn't exist
    const createTable = await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
      );
    `);

    console.log(`Created "users" table`);

    // Insert data into the "users" table
    const insertedUsers = await Promise.all(
      users.map(async (user) => {
        const hashedPassword = await bcrypt.hash(user.password, 10);
        const insertQuery = `
          INSERT INTO users (id, name, email, password)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (id) DO NOTHING;
        `;
        return await client.query(insertQuery, [user.id, user.name, user.email, hashedPassword]);
      }),
    );

    console.log(`Seeded ${insertedUsers.length} users`);

    return {
      createTable,
      users: insertedUsers,
    };
  } catch (error) {
    console.error('Error seeding users:', error);
    throw error;
  }
}

async function seedInvoices(client) {
  try {
    await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Create the "invoices" table if it doesn't exist
    const createTable = await client.query(`
        CREATE TABLE IF NOT EXISTS invoices (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        customer_id UUID NOT NULL,
        amount INT NOT NULL,
        status VARCHAR(255) NOT NULL,
        date DATE NOT NULL
      );
    `);

    console.log(`Created "invoices" table`);

    // Insert data into the "invoices" table
    const insertedInvoices = await Promise.all(
      invoices.map(async (invoice) => {
        const insertQuery = `
          INSERT INTO invoices (customer_id, amount, status, date)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (id) DO NOTHING;
        `;
        return await client.query(insertQuery, [invoice.customer_id, invoice.amount, invoice.status, invoice.date]);
      }),
    );

    console.log(`Seeded ${insertedInvoices.length} invoices`);

    return {
      createTable,
      invoices: insertedInvoices,
    };
  } catch (error) {
    console.error('Error seeding invoices:', error);
    throw error;
  }
}

async function seedCustomers(client) {
  try {
    await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Create the "customers" table if it doesn't exist
    const createTable = await client.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        image_url VARCHAR(255) NOT NULL
      );
    `);

    console.log(`Created "customers" table`);

    // Insert data into the "customers" table
    const insertedCustomers = await Promise.all(
      // customers.map(
      //   async (customer) => client.sql`
      //   INSERT INTO customers (id, name, email, image_url)
      //   VALUES (${customer.id}, ${customer.name}, ${customer.email}, ${customer.image_url})
      //   ON CONFLICT (id) DO NOTHING;
      // `,
      // ),
      customers.map(
        async (customer) => {
          const insertQuery = `
            INSERT INTO customers (id, name, email, image_url)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (id) DO NOTHING;
          `;
          return await client.query(insertQuery, [customer.id, customer.name, customer.email, customer.image_url]);
        }),
    );

    console.log(`Seeded ${insertedCustomers.length} customers`);

    return {
      createTable,
      customers: insertedCustomers,
    };
  } catch (error) {
    console.error('Error seeding customers:', error);
    throw error;
  }
}

async function seedRevenue(client) {
  try {
    // Create the "revenue" table if it doesn't exist
    const createTable = await client.query(`
      CREATE TABLE IF NOT EXISTS revenue (
        month VARCHAR(4) NOT NULL UNIQUE,
        revenue INT NOT NULL
      );
    `);

    console.log(`Created "revenue" table`);

    // Insert data into the "revenue" table
    const insertedRevenue = await Promise.all(
      // revenue.map(
      //   (rev) => client.query`
      //   INSERT INTO revenue (month, revenue)
      //   VALUES (${rev.month}, ${rev.revenue})
      //   ON CONFLICT (month) DO NOTHING;
      // `,
      // ),
      revenue.map(async (rev) => {
        const insertQuery = `
          INSERT INTO revenue (month, revenue)
          VALUES ($1, $2)
          ON CONFLICT (month) DO NOTHING;
        `;
        return await client.query(insertQuery, [rev.month, rev.revenue]);
      }),
    );

    console.log(`Seeded ${insertedRevenue.length} revenue`);

    return {
      createTable,
      revenue: insertedRevenue,
    };
  } catch (error) {
    console.error('Error seeding revenue:', error);
    throw error;
  }
}

async function main() {
  const client = await pool.connect();

  await seedUsers(client);
  await seedCustomers(client);
  await seedInvoices(client);
  await seedRevenue(client);

  await client.end();
}

main().catch((err) => {
  console.error(
    'An error occurred while attempting to seed the database:',
    err,
  );
});
