/**
 * Formats a monetary amount into Indian Rupee currency format.
 * @param {number} amount
 * @returns {string} e.g. "₹89,000"
 */
export function formatCurrency(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return '₹0';
  return '₹' + Number(amount).toLocaleString('en-IN');
}

/**
 * Formats a Unix timestamp (seconds) into a readable date-time string.
 * @param {number} timestamp
 * @returns {string} e.g. "Sep 11, 2026, 11:45 AM"
 */
export function formatTimestamp(timestamp) {
  if (!timestamp) return 'N/A';
  // Timestamps in engine are either seconds (10-digit) or ms
  const ms = timestamp < 1e11 ? timestamp * 1000 : timestamp;
  const date = new Date(ms);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Formats a plain number with locale commas.
 * @param {number} num
 * @returns {string} e.g. "1,000"
 */
export function formatNumber(num) {
  if (num === undefined || num === null || isNaN(num)) return '0';
  return Number(num).toLocaleString('en-US');
}
