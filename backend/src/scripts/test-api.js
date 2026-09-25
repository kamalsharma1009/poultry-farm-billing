const http = require('http');

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTest() {
  console.log('=== BROILERS EXPRESS INTEGRATION TEST ===');

  // 1. Login
  const loginRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, { email: 'admin@broilersexpress.com', password: 'Admin@123' });

  console.log('1. LOGIN STATUS:', loginRes.status, loginRes.data.message);
  const token = loginRes.data.data.token;

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  // 2. Create Customer (unique mobile)
  const randomDigits = String(Math.floor(10000000 + Math.random() * 90000000));
  const mobile = `9${randomDigits}`;

  const custRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/customers',
    method: 'POST',
    headers: authHeaders,
  }, {
    customerName: 'Ramesh Mehta',
    businessName: 'Dilwale Chicken Center',
    mobile,
    address: 'Motton Market, Jaysingpur',
  });

  console.log('2. CREATE CUSTOMER:', custRes.status, custRes.data.data?.customer?.customerCode);
  const customer = custRes.data.data.customer;

  // 3. Create Bill
  const billRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/bills',
    method: 'POST',
    headers: authHeaders,
  }, {
    customerId: customer.id,
    billDate: new Date().toISOString(),
    items: [
      {
        productName: 'Broiler Chicken',
        quantity: 25,
        weight: 67.000,
        rate: 122.00,
      },
    ],
  });

  console.log('3. CREATE BILL:', billRes.status, 'Bill No:', billRes.data.data?.bill?.billNumber, 'Total Amount:', billRes.data.data?.bill?.grandTotal);
  console.log('   WhatsApp Link:', billRes.data.data?.whatsappInfo?.whatsappUrl);

  const bill = billRes.data.data.bill;

  // 4. Fetch Dashboard Summary
  const dashRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/dashboard/summary',
    method: 'GET',
    headers: authHeaders,
  });

  console.log('4. DASHBOARD SUMMARY:', dashRes.data.data?.summary);

  // 5. Test PDF API
  const pdfRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/bills/${bill.id}/pdf`,
    method: 'GET',
    headers: authHeaders,
  });

  console.log('5. PDF GENERATION STATUS:', pdfRes.status, 'Content-Type:', pdfRes.headers['content-type']);
  console.log('=== TEST COMPLETED SUCCESSFULLY ===');
}

runTest().catch(console.error);
