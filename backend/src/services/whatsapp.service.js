/**
 * Normalizes Indian mobile number to standard 10-digit format and 91 prefixed format for WhatsApp.
 */
function normalizeMobile(mobile) {
  if (!mobile) return '';
  const digits = String(mobile).replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  if (digits.length > 10) return digits.slice(-10) ? `91${digits.slice(-10)}` : digits;
  return digits;
}

function generateBillMessage(bill, customer, settings, pdfUrl) {
  const businessName = settings?.businessName || 'Broilers Express';
  const billDate = bill.billDate ? new Date(bill.billDate).toLocaleDateString('en-IN') : '';
  const billTotal = Number(bill.grandTotal || 0);
  const previousDue = Number(bill.previousDue || 0);
  const paidAmount = Number(bill.paidAmount || 0);
  const grossTotal = billTotal + previousDue;
  const totalAmount = grossTotal - paidAmount;

  const fmt = (val) => `₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  let msg = `Hello ${customer.customerName} (${customer.businessName || ''}),\n\nThank you for your business with ${businessName}!\n\n*Bill Summary:*\nBill No: ${bill.billNumber}\nDate: ${billDate}\nBill Total: ${fmt(billTotal)}\n`;

  if (previousDue > 0) {
    msg += `Previous Due: ${fmt(previousDue)}\nGross Total: ${fmt(grossTotal)}\n`;
  }
  if (paidAmount > 0) {
    msg += `Paid Amount: ${fmt(paidAmount)}\n`;
  }
  msg += `*Total Amount / Outstanding: ${fmt(totalAmount)}*\n`;

  if (pdfUrl) {
    msg += `\n📄 *View / Download PDF Invoice:* \n${pdfUrl}\n`;
  } else {
    msg += `\nPlease find your bill copy attached.\n`;
  }

  msg += `\nThank you!\n*${businessName}*\n${settings?.address || 'Motton Market, Jaysingpur'}`;

  return msg;
}

function openWhatsAppChat(mobile, bill, customer, settings, host) {
  const formattedMobile = normalizeMobile(mobile);
  
  // Construct direct public PDF link if host is available
  const pdfUrl = host ? `${host}/api/bills/public/${bill.id}/pdf` : null;

  const message = generateBillMessage(bill, customer, settings, pdfUrl);
  const encodedText = encodeURIComponent(message);
  
  const whatsappUrl = `https://wa.me/${formattedMobile}?text=${encodedText}`;
  
  return {
    whatsappUrl,
    formattedMobile,
    messageText: message,
    pdfUrl,
  };
}

module.exports = {
  normalizeMobile,
  generateBillMessage,
  openWhatsAppChat,
};
