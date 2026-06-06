import bcrypt from 'bcryptjs';
import db, { run } from '../config/db';

async function seed() {
  console.log('Starting SQLite database seeding...');

  try {
    // Wait briefly for connection hooks
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Clear existing data (in reverse dependency order)
    await run('DELETE FROM notifications');
    await run('DELETE FROM activity_logs');
    await run('DELETE FROM invoices');
    await run('DELETE FROM purchase_orders');
    await run('DELETE FROM approvals');
    await run('DELETE FROM quotation_items');
    await run('DELETE FROM quotations');
    await run('DELETE FROM rfq_vendors');
    await run('DELETE FROM rfq_items');
    await run('DELETE FROM rfqs');
    await run('DELETE FROM users');
    await run('DELETE FROM vendors');

    // Reset sqlite autoincrement sequence counters
    await run('DELETE FROM sqlite_sequence');

    console.log('✓ Cleared database and reset auto-increment counters.');

    // 1. Seed Vendors
    await run(
      `INSERT INTO vendors (id, name, category, gst_number, email, phone, status, rating) 
       VALUES (1, 'Acme Hardware', 'Hardware', '29ABCDE1234F1Z5', 'contact@acme.com', '+1-555-0199', 'active', 4.8)`
    );
    await run(
      `INSERT INTO vendors (id, name, category, gst_number, email, phone, status, rating) 
       VALUES (2, 'Globex Software', 'Software Development', '29ABCDE5678F1Z6', 'sales@globex.com', '+1-555-0288', 'active', 4.6)`
    );
    console.log('✓ Seeded Vendors.');

    // Passwords hashing
    const adminHash = bcrypt.hashSync('adminpassword', 10);
    const officerHash = bcrypt.hashSync('officerpassword', 10);
    const managerHash = bcrypt.hashSync('managerpassword', 10);
    const vendor1Hash = bcrypt.hashSync('vendor1password', 10);
    const vendor2Hash = bcrypt.hashSync('vendor2password', 10);

    // 2. Seed Users
    await run(
      `INSERT INTO users (id, name, email, password_hash, role, vendor_id) 
       VALUES (1, 'Admin User', 'admin@vendorbridge.com', ?, 'admin', NULL)`,
      [adminHash]
    );
    await run(
      `INSERT INTO users (id, name, email, password_hash, role, vendor_id) 
       VALUES (2, 'Officer User', 'officer@vendorbridge.com', ?, 'officer', NULL)`,
      [officerHash]
    );
    await run(
      `INSERT INTO users (id, name, email, password_hash, role, vendor_id) 
       VALUES (3, 'Manager User', 'manager@vendorbridge.com', ?, 'manager', NULL)`,
      [managerHash]
    );
    await run(
      `INSERT INTO users (id, name, email, password_hash, role, vendor_id) 
       VALUES (4, 'Acme Sales Rep', 'vendor1@vendorbridge.com', ?, 'vendor', 1)`,
      [vendor1Hash]
    );
    await run(
      `INSERT INTO users (id, name, email, password_hash, role, vendor_id) 
       VALUES (5, 'Globex Account Mgr', 'vendor2@vendorbridge.com', ?, 'vendor', 2)`,
      [vendor2Hash]
    );
    console.log('✓ Seeded Users.');

    // 3. Seed RFQs
    // RFQ 1: Open, RFQ 2: Draft
    await run(
      `INSERT INTO rfqs (id, rfq_number, title, description, deadline, status, created_by) 
       VALUES (1, 'RFQ-2026-0001', 'Enterprise Server Room Procurement', 'Requesting quotes for database servers and networking switches.', '2026-12-31T23:59:59Z', 'open', 2)`
    );
    await run(
      `INSERT INTO rfqs (id, rfq_number, title, description, deadline, status, created_by) 
       VALUES (2, 'RFQ-2026-0002', 'Office Furniture Procurement', 'Ergonomic chairs for staff.', '2026-12-31T23:59:59Z', 'draft', 2)`
    );

    // RFQ Items for RFQ 1
    await run(
      `INSERT INTO rfq_items (id, rfq_id, product_name, quantity, unit) 
       VALUES (1, 1, 'Rackmount Server 2U', 3.0, 'Units')`
    );
    await run(
      `INSERT INTO rfq_items (id, rfq_id, product_name, quantity, unit) 
       VALUES (2, 1, 'Managed 48-Port Switch', 2.0, 'Units')`
    );

    // Invite Vendors to RFQ 1
    await run(`INSERT INTO rfq_vendors (rfq_id, vendor_id, status) VALUES (1, 1, 'invited')`);
    await run(`INSERT INTO rfq_vendors (rfq_id, vendor_id, status) VALUES (1, 2, 'invited')`);
    console.log('✓ Seeded RFQs & Invited Vendors.');

    // 4. Seed Quotations for RFQ 1
    // Quotation 1 (Vendor 1 - Acme Hardware): Subtotal = 510000.0, Tax = 91800.0 (18%), Total = 601800.0
    await run(
      `INSERT INTO quotations (id, rfq_id, vendor_id, subtotal, tax_rate, tax_amount, total_amount, delivery_days, notes, status, is_selected) 
       VALUES (1, 1, 1, 510000.0, 18.0, 91800.0, 601800.0, 14, 'ACME custom config with 3-year warranty included.', 'submitted', 0)`
    );
    await run(
      `INSERT INTO quotation_items (id, quotation_id, rfq_item_id, product_name, quantity, unit_price, total_price) 
       VALUES (1, 1, 1, 'Rackmount Server 2U', 3.0, 150000.00, 450000.00)`
    );
    await run(
      `INSERT INTO quotation_items (id, quotation_id, rfq_item_id, product_name, quantity, unit_price, total_price) 
       VALUES (2, 1, 2, 'Managed 48-Port Switch', 2.0, 30000.00, 60000.00)`
    );

    // Quotation 2 (Vendor 2 - Globex Software): Subtotal = 484000.0, Tax = 87120.0 (18%), Total = 571120.0 (Cheaper)
    await run(
      `INSERT INTO quotations (id, rfq_id, vendor_id, subtotal, tax_rate, tax_amount, total_amount, delivery_days, notes, status, is_selected) 
       VALUES (2, 1, 2, 484000.0, 18.0, 87120.0, 571120.0, 30, 'Globex standard corporate pricing.', 'submitted', 0)`
    );
    await run(
      `INSERT INTO quotation_items (id, quotation_id, rfq_item_id, product_name, quantity, unit_price, total_price) 
       VALUES (3, 2, 1, 'Rackmount Server 2U', 3.0, 140000.00, 420000.00)`
    );
    await run(
      `INSERT INTO quotation_items (id, quotation_id, rfq_item_id, product_name, quantity, unit_price, total_price) 
       VALUES (4, 2, 2, 'Managed 48-Port Switch', 2.0, 32000.00, 64000.00)`
    );
    console.log('✓ Seeded Quotations.');

    // Seed Activity Log
    await run(
      `INSERT INTO activity_logs (id, user_id, action, entity_type, entity_id, description, timestamp) 
       VALUES (1, 1, 'DB_SEED', 'SYSTEM', NULL, 'Database initialized and seeded with default data.', ?)`,
      [new Date().toISOString()]
    );

    console.log('Database seeded successfully.');
  } catch (error: any) {
    console.error('Database seeding failed:', error.message);
  } finally {
    db.close();
  }
}

// Execute if run directly
if (require.main === module || process.argv.includes('--run')) {
  seed();
}

export default seed;
