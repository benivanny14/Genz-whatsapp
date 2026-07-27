/**
 * Mobile Money SMS Parser
 * -------------------------------------------------------------------------
 * Parses confirmation SMS text from Tanzanian (and similar) mobile money
 * operators to extract: transactionId, amount, currency, date, senderPhone
 * and the operator name.
 *
 * DESIGN GOAL: extensible. To support a new operator, add a new entry to
 * the `PARSERS` array below — nothing else in the system needs to change.
 * Each parser is tried in order; the first one whose `detect()` matches
 * wins. If none match, `parsePaymentSms()` falls back to a generic
 * best-effort regex pass so the admin can still review the raw SMS.
 * -------------------------------------------------------------------------
 */

const clean = (str = '') => String(str).replace(/\s+/g, ' ').trim();

// Turns "1,234,567.00" / "1234567" into a Number
const toAmount = (raw) => {
  if (!raw) return null;
  const n = parseFloat(String(raw).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
};

// Generic transaction-id-looking token: mostly uppercase letters + digits, 6-20 chars
const GENERIC_TXN_REGEX = /\b([A-Z0-9]{6,20})\b/;

/**
 * Each parser definition:
 *  - operator: display name stored on the payment record
 *  - detect(text): boolean — should this parser handle the SMS?
 *  - parse(text): { transactionId, amount, currency, date, senderPhone }
 */
const PARSERS = [
  // ---------------------------------------------------------------------
  // M-Pesa (Vodacom Tanzania) — e.g.
  // "QGH7K8J9L0 Confirmed. Tsh50,000.00 received from JOHN DOE 255712345678
  //  on 12/7/26 at 3:45 PM. New M-PESA balance is Tsh120,000.00."
  // ---------------------------------------------------------------------
  {
    operator: 'M-Pesa',
    detect: (t) => /m-?pesa/i.test(t) && /confirmed/i.test(t),
    parse: (t) => {
      const txnMatch = t.match(/^([A-Z0-9]{8,12})\s+Confirmed/i) || t.match(GENERIC_TXN_REGEX);
      const amountMatch = t.match(/Tsh\s?([\d,]+\.?\d*)\s+(?:received|paid|sent)/i) || t.match(/Tsh\s?([\d,]+\.?\d*)/i);
      const dateMatch = t.match(/on\s+(\d{1,2}\/\d{1,2}\/\d{2,4})\s+at\s+([\d:]+\s?[APMapm]{2})/);
      const phoneMatch = t.match(/(2557\d{8}|07\d{8})/);
      return {
        transactionId: txnMatch ? txnMatch[1].toUpperCase() : null,
        amount: toAmount(amountMatch?.[1]),
        currency: 'TZS',
        date: dateMatch ? `${dateMatch[1]} ${dateMatch[2]}` : null,
        senderPhone: phoneMatch ? phoneMatch[1] : null
      };
    }
  },

  // ---------------------------------------------------------------------
  // Airtel Money — e.g.
  // "TxnID: MP240712.1234.A56789. You have received Tsh 20,000 from
  //  255754112233 on 12-07-2026 14:20. Balance: Tsh 45,000"
  // ---------------------------------------------------------------------
  {
    operator: 'Airtel Money',
    detect: (t) => /airtel/i.test(t),
    parse: (t) => {
      const txnMatch = t.match(/Txn\s?ID:?\s*([A-Z0-9.\-]{6,25})/i) || t.match(GENERIC_TXN_REGEX);
      const amountMatch = t.match(/Tsh\s?([\d,]+\.?\d*)/i);
      const dateMatch = t.match(/on\s+(\d{1,2}[\-\/]\d{1,2}[\-\/]\d{2,4})\s+(\d{1,2}:\d{2})/);
      const phoneMatch = t.match(/(2557\d{8}|07\d{8})/);
      return {
        transactionId: txnMatch ? txnMatch[1].toUpperCase().replace(/\.$/, '') : null,
        amount: toAmount(amountMatch?.[1]),
        currency: 'TZS',
        date: dateMatch ? `${dateMatch[1]} ${dateMatch[2]}` : null,
        senderPhone: phoneMatch ? phoneMatch[1] : null
      };
    }
  },

  // ---------------------------------------------------------------------
  // Mixx by Yas (formerly Tigo Pesa) — e.g.
  // "Umepokea Tshs 15,000 kutoka 255678112233. Kumbukumbu: CEI7X8Y9Z0.
  //  Tarehe: 12/07/2026 09:15. Salio: Tshs 30,000"
  // ---------------------------------------------------------------------
  {
    operator: 'Mixx by Yas',
    detect: (t) => /mixx|tigo\s?pesa/i.test(t),
    parse: (t) => {
      const txnMatch = t.match(/Kumbukumbu:?\s*([A-Z0-9]{6,20})/i) || t.match(/Ref(?:erence)?:?\s*([A-Z0-9]{6,20})/i) || t.match(GENERIC_TXN_REGEX);
      const amountMatch = t.match(/Tshs?\s?([\d,]+\.?\d*)/i);
      const dateMatch = t.match(/Tarehe:?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})\s*(\d{1,2}:\d{2})?/i);
      const phoneMatch = t.match(/(2556\d{8}|2567\d{8}|06\d{8}|07\d{8})/);
      return {
        transactionId: txnMatch ? txnMatch[1].toUpperCase() : null,
        amount: toAmount(amountMatch?.[1]),
        currency: 'TZS',
        date: dateMatch ? clean(`${dateMatch[1]} ${dateMatch[2] || ''}`) : null,
        senderPhone: phoneMatch ? phoneMatch[1] : null
      };
    }
  },

  // ---------------------------------------------------------------------
  // HaloPesa — e.g.
  // "Umetuma Tsh10,000 kwa ERASTOR GODFREY PAUL (0639533428). TxnID
  //  HP12345678. Tarehe 12-07-2026 10:05"
  // ---------------------------------------------------------------------
  {
    operator: 'HaloPesa',
    detect: (t) => /halo\s?pesa/i.test(t),
    parse: (t) => {
      const txnMatch = t.match(/TxnID:?\s*([A-Z0-9]{6,20})/i) || t.match(GENERIC_TXN_REGEX);
      const amountMatch = t.match(/Tsh\s?([\d,]+\.?\d*)/i);
      const dateMatch = t.match(/Tarehe:?\s*(\d{1,2}[\-\/]\d{1,2}[\-\/]\d{2,4})\s*(\d{1,2}:\d{2})?/i);
      const phoneMatch = t.match(/\((0\d{9}|2556\d{8})\)/) || t.match(/(0\d{9})/);
      return {
        transactionId: txnMatch ? txnMatch[1].toUpperCase() : null,
        amount: toAmount(amountMatch?.[1]),
        currency: 'TZS',
        date: dateMatch ? clean(`${dateMatch[1]} ${dateMatch[2] || ''}`) : null,
        senderPhone: phoneMatch ? phoneMatch[1] : null
      };
    }
  }
];

/**
 * Generic fallback used when no operator-specific parser matches.
 * Best-effort only — designed so the admin can still review manually.
 */
function genericFallbackParse(text) {
  const amountMatch = text.match(/(?:Tsh|TZS|TShs?)\.?\s?([\d,]+\.?\d*)/i) || text.match(/([\d,]{4,}\.?\d*)\s?(?:Tsh|TZS)/i);
  const txnMatch = text.match(/(?:txn|transaction|ref(?:erence)?|kumbukumbu|receipt)\s*(?:id|no)?\.?:?\s*([A-Z0-9\-.]{6,25})/i) || text.match(GENERIC_TXN_REGEX);
  const phoneMatch = text.match(/(2557\d{8}|2556\d{8}|07\d{8}|06\d{8})/);
  const dateMatch = text.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);

  return {
    operator: 'Unknown',
    transactionId: txnMatch ? txnMatch[1].toUpperCase() : null,
    amount: toAmount(amountMatch?.[1]),
    currency: 'TZS',
    date: dateMatch ? dateMatch[1] : null,
    senderPhone: phoneMatch ? phoneMatch[1] : null
  };
}

/**
 * Parse a mobile money confirmation SMS.
 * @param {string} smsText raw pasted SMS
 * @returns {{
 *   success: boolean,
 *   operator: string,
 *   transactionId: string|null,
 *   amount: number|null,
 *   currency: string,
 *   date: string|null,
 *   senderPhone: string|null,
 *   confidence: 'high'|'low'
 * }}
 */
function parsePaymentSms(smsText) {
  const text = clean(smsText);
  if (!text) {
    return {
      success: false,
      operator: null,
      transactionId: null,
      amount: null,
      currency: 'TZS',
      date: null,
      senderPhone: null,
      confidence: 'low'
    };
  }

  const matched = PARSERS.find((p) => p.detect(text));

  if (matched) {
    const result = matched.parse(text);
    return {
      success: Boolean(result.transactionId && result.amount),
      operator: matched.operator,
      transactionId: result.transactionId,
      amount: result.amount,
      currency: result.currency || 'TZS',
      date: result.date,
      senderPhone: result.senderPhone,
      confidence: result.transactionId && result.amount ? 'high' : 'low'
    };
  }

  const fallback = genericFallbackParse(text);
  return {
    success: Boolean(fallback.transactionId && fallback.amount),
    ...fallback,
    confidence: 'low'
  };
}

/**
 * Validate a transaction id format. Deliberately permissive since formats
 * vary by operator — this mainly guards against empty / garbage input.
 */
function isValidTransactionId(id) {
  if (!id) return false;
  const trimmed = String(id).trim();
  return /^[A-Z0-9.\-]{6,25}$/i.test(trimmed);
}

module.exports = {
  parsePaymentSms,
  isValidTransactionId,
  PARSERS // exported so admin tooling / tests can introspect supported operators
};
