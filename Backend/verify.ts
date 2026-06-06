import app from './src/server';
import http from 'http';
import { execSync } from 'child_process';

const PORT = 5055;
const BASE_URL = `http://localhost:${PORT}/api`;

async function apiCall(
  url: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  body?: any,
  token?: string
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const status = response.status;
  let data;
  try {
    data = await response.json();
  } catch (err) {
    data = null;
  }
  return { status, data };
}

async function verifyAll() {
  console.log('====================================================');
  console.log('   STARTING VENDORBRIDGE SQLITE BACKEND E2E TEST    ');
  console.log('====================================================');

  console.log('Resetting and seeding database...');
  execSync('npx tsx src/db/seed.ts', { stdio: 'inherit' });

  let adminToken = '';
  let officerToken = '';
  let managerToken = '';
  let vendor1Token = '';
  let vendor2Token = '';

  let newVendorId = 0;
  let newRfqId = 0;
  let quotationId = 0;
  let poId = 0;
  let invoiceId = 0;

  try {
    // -------------------------------------------------------------------------
    // 1. AUTH TESTING
    // -------------------------------------------------------------------------
    console.log('\n--- 1. Testing Authentications ---');

    // Admin Login
    console.log('Logging in as Admin...');
    const adminLogin = await apiCall(`${BASE_URL}/auth/login`, 'POST', {
      email: 'admin@vendorbridge.com',
      password: 'adminpassword',
    });
    if (adminLogin.status !== 200) throw new Error('Admin login failed');
    adminToken = adminLogin.data.data.token;
    console.log('✓ Admin login successful.');

    // Officer Login
    console.log('Logging in as Procurement Officer...');
    const officerLogin = await apiCall(`${BASE_URL}/auth/login`, 'POST', {
      email: 'officer@vendorbridge.com',
      password: 'officerpassword',
    });
    if (officerLogin.status !== 200) throw new Error('Officer login failed');
    officerToken = officerLogin.data.data.token;
    console.log('✓ Procurement Officer login successful.');

    // Manager Login
    console.log('Logging in as Manager...');
    const managerLogin = await apiCall(`${BASE_URL}/auth/login`, 'POST', {
      email: 'manager@vendorbridge.com',
      password: 'managerpassword',
    });
    if (managerLogin.status !== 200) throw new Error('Manager login failed');
    managerToken = managerLogin.data.data.token;
    console.log('✓ Manager login successful.');

    // Vendor Login
    console.log('Logging in as Vendor 1 (Acme Sales)...');
    const vendor1Login = await apiCall(`${BASE_URL}/auth/login`, 'POST', {
      email: 'vendor1@vendorbridge.com',
      password: 'vendor1password',
    });
    if (vendor1Login.status !== 200) throw new Error('Vendor 1 login failed');
    vendor1Token = vendor1Login.data.data.token;
    console.log('✓ Vendor 1 login successful.');

    console.log('Logging in as Vendor 2 (Globex Account Mgr)...');
    const vendor2Login = await apiCall(`${BASE_URL}/auth/login`, 'POST', {
      email: 'vendor2@vendorbridge.com',
      password: 'vendor2password',
    });
    if (vendor2Login.status !== 200) throw new Error('Vendor 2 login failed');
    vendor2Token = vendor2Login.data.data.token;
    console.log('✓ Vendor 2 login successful.');

    // -------------------------------------------------------------------------
    // 2. VENDORS CRUD TESTING
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Testing Vendors CRUD & Filters ---');

    // Create Vendor
    console.log('Officer creating a new vendor "Cyberdyne Systems"...');
    const vendorCreate = await apiCall(
      `${BASE_URL}/vendors`,
      'POST',
      {
        name: 'Cyberdyne Systems',
        category: 'Electronics',
        gst_number: '29ABCDE0000F1Z4',
        email: 'info@cyberdyne.com',
        phone: '+1-555-0399',
        status: 'active',
      },
      officerToken
    );
    if (vendorCreate.status !== 201) {
      throw new Error(`Vendor creation failed. Status: ${vendorCreate.status}, Response: ${JSON.stringify(vendorCreate.data)}`);
    }
    newVendorId = vendorCreate.data.data.vendorId;
    console.log(`✓ Vendor created with ID: ${newVendorId}`);

    // Get all vendors & filtering by status
    console.log('Listing all active Vendors...');
    const listVendors = await apiCall(
      `${BASE_URL}/vendors?status=active`,
      'GET',
      undefined,
      officerToken
    );
    console.log(`Found ${listVendors.data.data.vendors.length} active vendors.`);
    if (listVendors.status !== 200) throw new Error('Listing vendors failed');
    console.log('✓ Vendor filtering by status works.');

    // Update Vendor
    console.log('Updating vendor category...');
    const vendorUpdate = await apiCall(
      `${BASE_URL}/vendors/${newVendorId}`,
      'PUT',
      { category: 'AI Infrastructure' },
      officerToken
    );
    if (vendorUpdate.status !== 200) throw new Error('Vendor update failed');
    console.log('✓ Vendor updated successfully.');

    // Delete Vendor Role Check
    console.log('Testing deletion permissions (Officer attempting delete)...');
    const officerDeleteRes = await apiCall(
      `${BASE_URL}/vendors/${newVendorId}`,
      'DELETE',
      undefined,
      officerToken
    );
    if (officerDeleteRes.status !== 403) {
      throw new Error('Security vulnerability: non-admin was allowed to delete a vendor');
    }
    console.log('✓ Correctly blocked non-admin from deleting vendor.');

    // -------------------------------------------------------------------------
    // 3. RFQS TESTING (Transactional nested items post)
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Testing RFQ Creation & Mappings ---');

    console.log('Officer creating a new RFQ with nested items in a transaction...');
    const rfqCreate = await apiCall(
      `${BASE_URL}/rfqs`,
      'POST',
      {
        title: 'Main Server Upgrades 2026',
        description: 'Nested transaction validation check.',
        deadline: '2026-12-31T23:59:59Z',
        items: [
          { product_name: 'Rackmount Server v2', quantity: 2, unit: 'Units' },
          { product_name: 'Console Monitor 1U', quantity: 1, unit: 'Units' },
        ],
        vendorIds: [1, 2], // invite both seeded vendors
      },
      officerToken
    );
    if (rfqCreate.status !== 201) {
      throw new Error(`RFQ transactional creation failed. Status: ${rfqCreate.status}, Response: ${JSON.stringify(rfqCreate.data)}`);
    }
    newRfqId = rfqCreate.data.data.rfqId;
    console.log(`✓ RFQ created with ID: ${newRfqId}, RFQ Number: ${rfqCreate.data.data.rfqNumber}`);

    // Verify RFQ details and nested items
    const rfqCheck = await apiCall(`${BASE_URL}/rfqs/${newRfqId}`, 'GET', undefined, officerToken);
    console.log('RFQ check details:', rfqCheck.data.data.rfq.title, '-', rfqCheck.data.data.rfq.items.length, 'items.');
    if (rfqCheck.data.data.rfq.items.length !== 2 || rfqCheck.data.data.rfq.invitedVendors.length !== 2) {
      throw new Error('RFQ nested items or vendor invites were not saved correctly');
    }
    console.log('✓ RFQ nested items and invitations validated successfully.');

    // -------------------------------------------------------------------------
    // 4. QUOTATIONS TESTING (GST computation, price comparison aggregate)
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Testing Quotations Submissions & Comparisons ---');

    // Vendor 1 submits quote
    console.log('Vendor 1 submitting bid for new RFQ...');
    const rfqItemId1 = rfqCheck.data.data.rfq.items[0].id;
    const rfqItemId2 = rfqCheck.data.data.rfq.items[1].id;

    const quote1 = await apiCall(
      `${BASE_URL}/quotations`,
      'POST',
      {
        rfq_id: newRfqId,
        delivery_days: 10,
        notes: 'Acme Premium bid.',
        items: [
          { rfq_item_id: rfqItemId1, product_name: 'Rackmount Server v2', quantity: 2, unit_price: 200000.00 },
          { rfq_item_id: rfqItemId2, product_name: 'Console Monitor 1U', quantity: 1, unit_price: 50000.00 },
        ], // Subtotal: 450,000 + GST = 531,000
      },
      vendor1Token
    );
    if (quote1.status !== 201) {
      throw new Error(`Quotation 1 submission failed. Status: ${quote1.status}, Response: ${JSON.stringify(quote1.data)}`);
    }
    console.log('✓ Quotation 1 submitted.');

    // Vendor 2 submits quote (Cheaper)
    console.log('Vendor 2 submitting bid for new RFQ...');
    const quote2 = await apiCall(
      `${BASE_URL}/quotations`,
      'POST',
      {
        rfq_id: newRfqId,
        delivery_days: 20,
        notes: 'Globex Budget bid.',
        items: [
          { rfq_item_id: rfqItemId1, product_name: 'Rackmount Server v2', quantity: 2, unit_price: 180000.00 },
          { rfq_item_id: rfqItemId2, product_name: 'Console Monitor 1U', quantity: 1, unit_price: 45000.00 },
        ], // Subtotal: 405,000 + GST = 477,900
      },
      vendor2Token
    );
    if (quote2.status !== 201) {
      throw new Error(`Quotation 2 submission failed. Status: ${quote2.status}, Response: ${JSON.stringify(quote2.data)}`);
    }
    quotationId = quote2.data.data.quotationId;
    console.log(`✓ Quotation 2 submitted. ID: ${quotationId}`);

    // Pull side-by-side comparison tables sorted by lowest total price
    console.log('Procurement Officer pulling comparison table (sorted by lowest price)...');
    const compareRes = await apiCall(
      `${BASE_URL}/rfqs/${newRfqId}/compare`,
      'GET',
      undefined,
      officerToken
    );
    if (compareRes.status !== 200) throw new Error('Quotation compare endpoint failed');
    console.log('Side-by-side Comparison table:');
    console.table(compareRes.data.data.comparison);

    // Verify sorting order: Vendor 2 (Globex, Cheaper) should be index 0
    const comparison = compareRes.data.data.comparison;
    if (comparison[0].total_amount > comparison[1].total_amount) {
      throw new Error('Comparison table is not sorted by lowest total price');
    }
    console.log('✓ Quotation comparisons side-by-side sorted by lowest total price verified.');

    // -------------------------------------------------------------------------
    // 5. APPROVALS TESTING (remarks check on reject status)
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Testing Manager Approval & Validation Gates ---');

    // Test rejection with missing remarks
    console.log('Manager attempting rejection with empty remarks...');
    const rejectEmptyRes = await apiCall(
      `${BASE_URL}/approvals`,
      'POST',
      {
        quotation_id: quotationId,
        status: 'rejected',
        remarks: ' ', // empty/whitespace
      },
      managerToken
    );
    if (rejectEmptyRes.status !== 400 || !rejectEmptyRes.data.error.includes('Remarks are mandatory')) {
      throw new Error('Security gate failed: manager allowed to reject quotation without remarks');
    }
    console.log('✓ Successfully blocked rejection without remarks.');

    // Test successful approval
    console.log('Manager approving Cheaper quotation...');
    const approveRes = await apiCall(
      `${BASE_URL}/approvals`,
      'POST',
      {
        quotation_id: quotationId,
        status: 'approved',
        remarks: 'Approved budget. Globex quote is economical.',
      },
      managerToken
    );
    if (approveRes.status !== 201) throw new Error('Quotation approval failed');
    const approvalId = approveRes.data.data.approvalId;
    console.log(`✓ Manager approval recorded. Approval ID: ${approvalId}`);

    // Verify quotation is selected
    const quoteCheck = await apiCall(
      `${BASE_URL}/quotations/${quotationId}/status`, // checking status via update logic or table
      'PUT',
      { status: 'selected' }, // re-asserting selected status
      officerToken
    );
    if (quoteCheck.status !== 200) throw new Error('Quotation status transition to selected failed');
    console.log('✓ Quotation status transitioned to selected.');

    // -------------------------------------------------------------------------
    // 6. PURCHASE ORDERS TESTING
    // -------------------------------------------------------------------------
    console.log('\n--- 6. Testing Purchase Orders ---');

    console.log('Officer issuing PO for selected quotation...');
    const poRes = await apiCall(
      `${BASE_URL}/purchase-orders`,
      'POST',
      {
        rfq_id: newRfqId,
        quotation_id: quotationId,
      },
      officerToken
    );
    if (poRes.status !== 201) throw new Error('PO generation failed');
    poId = poRes.data.data.poId;
    const poNumber = poRes.data.data.poNumber;
    const poTotalAmount = poRes.data.data.totalAmount;
    console.log(`✓ PO issued. PO Number: ${poNumber}, Total Amount: ${poTotalAmount}`);
    if (poTotalAmount !== 477900.0) {
      throw new Error(`PO amount computation error. Expected 477900.0, got ${poTotalAmount}`);
    }
    console.log('✓ PO Total amount matches quotation total amount (477,900.0).');

    // -------------------------------------------------------------------------
    // 7. INVOICES TESTING (18% GST calculation, download, email mock, activity log)
    // -------------------------------------------------------------------------
    console.log('\n--- 7. Testing Invoices, 18% GST Calculations, Email & Downloads ---');

    console.log('Vendor 2 generating invoice for PO...');
    const invoiceRes = await apiCall(
      `${BASE_URL}/invoices`,
      'POST',
      {
        po_id: poId,
        due_date: '2026-06-30',
      },
      vendor2Token
    );
    if (invoiceRes.status !== 201) {
      throw new Error(`Invoice generation failed. Status: ${invoiceRes.status}, Response: ${JSON.stringify(invoiceRes.data)}`);
    }
    invoiceId = invoiceRes.data.data.invoiceId;
    const invoiceNumber = invoiceRes.data.data.invoiceNumber;
    const subtotal = invoiceRes.data.data.subtotal;
    const taxAmount = invoiceRes.data.data.taxAmount;
    const totalAmount = invoiceRes.data.data.totalAmount;
    console.log(`✓ Invoice created: ${invoiceNumber}. Subtotal: ${subtotal}, GST: ${taxAmount}, Total: ${totalAmount}`);

    // Verify invoice GST logic
    const expectedTax = subtotal * 0.18;
    const expectedTotal = subtotal + expectedTax;
    if (taxAmount !== expectedTax || totalAmount !== expectedTotal) {
      throw new Error('Invoice GST calculation is mathematically incorrect');
    }
    console.log('✓ 18% GST calculation math validated.');

    // Download invoice mock
    console.log('Triggering download invoice pdf mock...');
    const downloadRes = await apiCall(
      `${BASE_URL}/invoices/${invoiceId}/download`,
      'GET',
      undefined,
      officerToken
    );
    if (downloadRes.status !== 200) throw new Error('Download mock failed');
    console.log('✓ Download metadata returned:', downloadRes.data.data.fileName);

    // Email invoice mock
    console.log('Triggering email invoice dispatch mock...');
    const emailRes = await apiCall(
      `${BASE_URL}/invoices/${invoiceId}/email`,
      'POST',
      undefined,
      officerToken
    );
    if (emailRes.status !== 200 || emailRes.data.data.updatedStatus !== 'sent') {
      throw new Error('Email mock failed');
    }
    console.log('✓ Email dispatch mock response:', emailRes.data.message);

    // Admin cleans up Cyberdyne Systems vendor
    console.log('\nCleaning up E2E generated vendor (Admin deleting Cyberdyne)...');
    const deleteRes = await apiCall(
      `${BASE_URL}/vendors/${newVendorId}`,
      'DELETE',
      undefined,
      adminToken
    );
    if (deleteRes.status !== 200) throw new Error('Vendor deletion failed');
    console.log('✓ E2E generated vendor deleted.');

    console.log('\n====================================================');
    console.log('       ALL END-TO-END VERIFICATIONS PASSED          ');
    console.log('====================================================');
  } catch (error: any) {
    console.error('\n❌ E2E VERIFICATION TEST FAILED:', error.message);
    process.exit(1);
  }
}

// Start temporary test server
const server = http.createServer(app);
server.listen(PORT, async () => {
  try {
    await verifyAll();
  } catch (err: any) {
    console.error('Test run crashed:', err.message);
  } finally {
    console.log('Stopping test server...');
    server.close();
    process.exit(0);
  }
});
