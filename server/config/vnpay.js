require('dotenv').config();
const crypto = require('crypto');

function sortObject(obj) {
  const sorted = {};
  const keys = Object.keys(obj).sort();
  for (const key of keys) {
    if (obj[key] !== null && obj[key] !== undefined && obj[key] !== '') {
      sorted[encodeURIComponent(key)] = encodeURIComponent(String(obj[key])).replace(/%20/g, '+');
    }
  }
  return sorted;
}

function formatDate(date) {
  const pad = (n) => (n < 10 ? '0' + n : n);
  const yyyy = date.getFullYear();
  const MM = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const HH = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${yyyy}${MM}${dd}${HH}${mm}${ss}`;
}

const vnpayConfig = {
  tmnCode: process.env.VNP_TMN_CODE || 'YOUR_TMN_CODE',
  hashSecret: process.env.VNP_HASH_SECRET || 'YOUR_VNP_HASH_SECRET',
  vnpUrl: process.env.VNP_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
  returnUrl: process.env.VNP_RETURN_URL || 'http://localhost:5000/payment/result.html',

  /**
   * Build signed VNPAY Payment URL
   */
  createPaymentUrl({ orderCode, amount, orderInfo, ipAddr = '127.0.0.1', bankCode = '', returnUrl = null }) {
    const createDate = formatDate(new Date());

    let vnpParams = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: this.tmnCode,
      vnp_Locale: 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: orderCode,
      vnp_OrderInfo: orderInfo || `Thanh toan don hang ${orderCode}`,
      vnp_OrderType: 'other',
      vnp_Amount: Math.round(amount * 100), // VNPAY multiplies amount by 100
      vnp_ReturnUrl: returnUrl || this.returnUrl,
      vnp_IpAddr: ipAddr,
      vnp_CreateDate: createDate
    };

    if (bankCode) {
      vnpParams.vnp_BankCode = bankCode;
    }

    // Sort parameters alphabetically
    vnpParams = sortObject(vnpParams);

    const signData = Object.keys(vnpParams)
      .map(k => `${k}=${vnpParams[k]}`)
      .join('&');

    const hmac = crypto.createHmac('sha512', this.hashSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    vnpParams.vnp_SecureHash = signed;

    const paymentUrl = `${this.vnpUrl}?` + Object.keys(vnpParams)
      .map(k => `${k}=${vnpParams[k]}`)
      .join('&');

    return {
      paymentUrl,
      signData,
      secureHash: signed
    };
  },

  /**
   * Verify signature of VNPAY return query or IPN callback
   */
  verifyReturnUrl(queryParams) {
    const params = { ...queryParams };
    const secureHash = params.vnp_SecureHash;

    delete params.vnp_SecureHash;
    delete params.vnp_SecureHashType;

    const sortedParams = sortObject(params);
    const signData = Object.keys(sortedParams)
      .map(k => `${k}=${sortedParams[k]}`)
      .join('&');

    const hmac = crypto.createHmac('sha512', this.hashSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    const isSignatureValid = (secureHash || '').toLowerCase() === signed.toLowerCase();

    return {
      isValid: isSignatureValid,
      orderCode: params.vnp_TxnRef,
      amount: params.vnp_Amount ? parseInt(params.vnp_Amount, 10) / 100 : 0,
      responseCode: params.vnp_ResponseCode,
      transactionNo: params.vnp_TransactionNo,
      bankCode: params.vnp_BankCode,
      payDate: params.vnp_PayDate,
      isSuccess: isSignatureValid && params.vnp_ResponseCode === '00'
    };
  }
};

module.exports = vnpayConfig;
