import { unstable_noStore as noStore } from 'next/cache';
import { sql } from '@vercel/postgres';
import {
  CustomerField,
  CustomersTableType,
  InvoiceForm,
  InvoicesTable,
  LatestInvoiceRaw,
  User,
  Revenue,
} from './definitions';
import { formatCurrency } from './utils';
import db from '@/app/lib/db';
import { PoolClient } from 'pg';

// let client: PoolClient;

export async function fetchRevenue() {
  noStore();
  let client;
  try {
    // Artificially delay a response for demo purposes.
    // Don't do this in production :)
    client = await db.connect();
    console.log('Fetching revenue data...');
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // const data = await db<Revenue>`SELECT * FROM revenue`;
    const data = await client.query(`SELECT * FROM revenue`);

    console.log('Data fetch completed after 3 seconds.');

    return data.rows;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch revenue data.');
  } finally {
    if (client) client.release();
  }
}

export async function fetchLatestInvoices() {
  let client;
  try {
    client = await db.connect();
    // const data = await sql<LatestInvoiceRaw>`
    const data = await client.query(`
      SELECT invoices.amount, customers.name, customers.image_url, customers.email, invoices.id
      FROM invoices
      JOIN customers ON invoices.customer_id = customers.id
      ORDER BY invoices.date DESC
      LIMIT 5`);

    const latestInvoices = data.rows.map((invoice) => ({
      ...invoice,
      amount: formatCurrency(invoice.amount),
    }));
    return latestInvoices;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch the latest invoices.');
  } finally {
    if (client) client.release();
  }
}

export async function fetchCardData() {
  let client;
  try {
    // You can probably combine these into a single SQL query
    // However, we are intentionally splitting them to demonstrate
    // how to initialize multiple queries in parallel with JS.
    client= await db.connect();
    const invoiceCountPromise = client.query(`SELECT COUNT(*) FROM invoices`);
    const customerCountPromise = client.query(`SELECT COUNT(*) FROM customers`);
    const invoiceStatusPromise = client.query(`SELECT
         SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) AS "paid",
         SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) AS "pending"
         FROM invoices`);

    const data = await Promise.all([
      invoiceCountPromise,
      customerCountPromise,
      invoiceStatusPromise,
    ]);

    const numberOfInvoices = Number(data[0].rows[0].count ?? '0');
    const numberOfCustomers = Number(data[1].rows[0].count ?? '0');
    const totalPaidInvoices = formatCurrency(data[2].rows[0].paid ?? '0');
    const totalPendingInvoices = formatCurrency(data[2].rows[0].pending ?? '0');

    return {
      numberOfCustomers,
      numberOfInvoices,
      totalPaidInvoices,
      totalPendingInvoices,
    };
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch card data.');
  } finally {
    if (client) client.release();
  }
}

const ITEMS_PER_PAGE = 6;
export async function fetchFilteredInvoices(
  query: string,
  currentPage: number,
) {
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;
  let client;
  try {
    client = await db.connect();
    const invoices = await client.query({
      text: `
        SELECT
          invoices.id,
          invoices.amount,
          invoices.date,
          invoices.status,
          customers.name,
          customers.email,
          customers.image_url
        FROM invoices
        JOIN customers ON invoices.customer_id = customers.id
        WHERE
          customers.name ILIKE $1 OR
          customers.email ILIKE $2 OR
          invoices.amount::text ILIKE $3 OR
          invoices.date::text ILIKE $4 OR
          invoices.status ILIKE $5
        ORDER BY invoices.date DESC
        LIMIT $6 OFFSET $7
      `,
      values: [`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, ITEMS_PER_PAGE, offset],
    });

    return invoices.rows;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoices on search....');
  } finally {
    if (client) client.release();
  }
}



export async function fetchInvoicesPages(query: string) {
  let client;
  try {
    client= await db.connect();
    const count = await client.query({
      text: `
        SELECT COUNT(*)
        FROM invoices
        JOIN customers ON invoices.customer_id = customers.id
        WHERE
          customers.name ILIKE $1 OR
          customers.email ILIKE $2 OR
          invoices.amount::text ILIKE $3 OR
          invoices.date::text ILIKE $4 OR
          invoices.status ILIKE $5
      `,
      values: [`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`],
    });

    const totalPages = Math.ceil(Number(count.rows[0].count) / ITEMS_PER_PAGE);
    return totalPages;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch total number of invoices on paginate.');
  } finally {
    if (client) client.release();
  }
}


export async function fetchInvoiceById(id: string) {
  noStore();
  let client;
  try {
    client = await db.connect();
    const queryText = `
      SELECT
        invoices.id,
        invoices.customer_id,
        invoices.amount,
        invoices.status
      FROM invoices
      WHERE invoices.id = $1;
    `;
    const { rows } = await client.query(queryText, [id]);

    // Ensure there's a result
    // if (rows.length === 0) {
    //   throw new Error(`Invoice with id ${id} not found.`);
    // }

    const invoice = rows[0];

    // Convert amount from cents to dollars
    invoice.amount /= 100;
    console.log(invoice);
    return invoice;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoice by id.');
  } finally {
    if (client) client.release();
  }
}


export async function fetchCustomers() {
  let client;
  try {
    client = await db.connect();
    const data = await client.query(`
      SELECT
        id,
        name
      FROM customers
      ORDER BY name ASC
    `);

    const customers = data.rows;
    return customers;
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch all customers on create.');
  } finally {
    if (client) client.release();
  }
}

export async function fetchFilteredCustomers(query: string) {
  try {
    const data = await sql<CustomersTableType>`
		SELECT
		  customers.id,
		  customers.name,
		  customers.email,
		  customers.image_url,
		  COUNT(invoices.id) AS total_invoices,
		  SUM(CASE WHEN invoices.status = 'pending' THEN invoices.amount ELSE 0 END) AS total_pending,
		  SUM(CASE WHEN invoices.status = 'paid' THEN invoices.amount ELSE 0 END) AS total_paid
		FROM customers
		LEFT JOIN invoices ON customers.id = invoices.customer_id
		WHERE
		  customers.name ILIKE ${`%${query}%`} OR
        customers.email ILIKE ${`%${query}%`}
		GROUP BY customers.id, customers.name, customers.email, customers.image_url
		ORDER BY customers.name ASC
	  `;

    const customers = data.rows.map((customer) => ({
      ...customer,
      total_pending: formatCurrency(customer.total_pending),
      total_paid: formatCurrency(customer.total_paid),
    }));

    return customers;
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch customer table.');
  }
}

export async function getUser(email: string) {
  let client;
  try {
    client = await db.connect();
    const user = await client.query(`SELECT * FROM users WHERE email=$1`, [email]);
    return user.rows[0] as User;
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw new Error('Failed to fetch user.');
  } finally {
    if (client) client.release();
  }
}
