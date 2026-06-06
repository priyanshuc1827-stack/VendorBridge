import sqlite3Lib from 'sqlite3';
import path from 'path';
import fs from 'fs';

const sqlite3 = sqlite3Lib.verbose();
const DB_FILE = path.resolve(process.cwd(), 'database.sqlite');
const dbExists = fs.existsSync(DB_FILE);

console.log(`SQLite Database Target Path: ${DB_FILE}`);
console.log(`Database File Exists: ${dbExists}`);

// Relational Schema definitions
export const DDL_USERS = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT UNIQUE,
    password_hash TEXT,
    role TEXT CHECK(role IN ('admin', 'officer', 'vendor', 'manager')),
    vendor_id INTEGER NULL
  );
`;

export const DDL_VENDORS = `
  CREATE TABLE IF NOT EXISTS vendors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    category TEXT,
    gst_number TEXT,
    email TEXT,
    phone TEXT,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'blocked')),
    rating REAL DEFAULT 0.0
  );
`;

export const DDL_RFQS = `
  CREATE TABLE IF NOT EXISTS rfqs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rfq_number TEXT UNIQUE,
    title TEXT,
    description TEXT,
    deadline TEXT,
    status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'open', 'closed', 'awarded', 'cancelled')),
    created_by INTEGER
  );
`;

export const DDL_RFQ_ITEMS = `
  CREATE TABLE IF NOT EXISTS rfq_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rfq_id INTEGER,
    product_name TEXT,
    quantity REAL,
    unit TEXT,
    FOREIGN KEY(rfq_id) REFERENCES rfqs(id) ON DELETE CASCADE
  );
`;

export const DDL_RFQ_VENDORS = `
  CREATE TABLE IF NOT EXISTS rfq_vendors (
    rfq_id INTEGER,
    vendor_id INTEGER,
    status TEXT DEFAULT 'invited',
    PRIMARY KEY (rfq_id, vendor_id)
  );
`;

export const DDL_QUOTATIONS = `
  CREATE TABLE IF NOT EXISTS quotations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rfq_id INTEGER,
    vendor_id INTEGER,
    subtotal REAL,
    tax_rate REAL DEFAULT 18.0,
    tax_amount REAL,
    total_amount REAL,
    delivery_days INTEGER,
    notes TEXT,
    status TEXT DEFAULT 'submitted' CHECK(status IN ('draft', 'submitted', 'selected', 'rejected')),
    is_selected INTEGER DEFAULT 0
  );
`;

export const DDL_QUOTATION_ITEMS = `
  CREATE TABLE IF NOT EXISTS quotation_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quotation_id INTEGER,
    rfq_item_id INTEGER,
    product_name TEXT,
    quantity REAL,
    unit_price REAL,
    total_price REAL
  );
`;

export const DDL_APPROVALS = `
  CREATE TABLE IF NOT EXISTS approvals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quotation_id INTEGER,
    rfq_id INTEGER,
    status TEXT DEFAULT 'pending',
    remarks TEXT
  );
`;

export const DDL_PURCHASE_ORDERS = `
  CREATE TABLE IF NOT EXISTS purchase_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    po_number TEXT UNIQUE,
    rfq_id INTEGER,
    quotation_id INTEGER,
    total_amount REAL,
    status TEXT DEFAULT 'issued'
  );
`;

export const DDL_INVOICES = `
  CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_number TEXT UNIQUE,
    po_id INTEGER,
    subtotal REAL,
    tax_amount REAL,
    total_amount REAL,
    status TEXT DEFAULT 'generated',
    due_date TEXT
  );
`;

export const DDL_ACTIVITY_LOGS = `
  CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT,
    entity_type TEXT,
    entity_id INTEGER,
    description TEXT,
    timestamp TEXT
  );
`;

export const DDL_NOTIFICATIONS = `
  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    title TEXT,
    message TEXT,
    is_read INTEGER DEFAULT 0
  );
`;

const SCHEMA_QUERIES = [
  DDL_VENDORS,
  DDL_USERS,
  DDL_RFQS,
  DDL_RFQ_ITEMS,
  DDL_RFQ_VENDORS,
  DDL_QUOTATIONS,
  DDL_QUOTATION_ITEMS,
  DDL_APPROVALS,
  DDL_PURCHASE_ORDERS,
  DDL_INVOICES,
  DDL_ACTIVITY_LOGS,
  DDL_NOTIFICATIONS,
];

const db = new sqlite3.Database(DB_FILE, (err) => {
  if (err) {
    console.error('Failed to open database connection:', err.message);
  } else {
    console.log('Connected to local database.sqlite successfully.');
    db.run('PRAGMA foreign_keys = ON;', (fkErr) => {
      if (fkErr) console.error('Failed to enable foreign keys:', fkErr.message);
    });

    if (!dbExists) {
      console.log('database.sqlite not found. Running schema creation DDL...');
      db.serialize(() => {
        for (const query of SCHEMA_QUERIES) {
          db.run(query, (qErr) => {
            if (qErr) {
              console.error('Failed executing schema initialization:', qErr.message);
            }
          });
        }
        console.log('Database tables successfully initialized.');
      });
    }
  }
});

// Promise-based SQL wrappers for controllers/seeders
export const run = (sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (this: any, err) {
      if (err) {
        reject(err);
      } else {
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    });
  });
};

export const get = <T>(sql: string, params: any[] = []): Promise<T | undefined> => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row as T | undefined);
      }
    });
  });
};

export const all = <T>(sql: string, params: any[] = []): Promise<T[]> => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows as T[]);
      }
    });
  });
};

export default db;
