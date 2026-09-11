/**
 * Maps a numeric risk score (0-100) to its corresponding severity tier.
 * Matches C++ RiskScorer definition:
 * LOW: 0-29, MEDIUM: 30-59, HIGH: 60-79, CRITICAL: 80-100
 * @param {number} score
 * @returns {'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'}
 */
export function getRiskLevel(score) {
  const num = Number(score) || 0;
  if (num >= 80) return 'CRITICAL';
  if (num >= 60) return 'HIGH';
  if (num >= 30) return 'MEDIUM';
  return 'LOW';
}

/**
 * Returns color constants and class names for a given risk level.
 * @param {'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string} level
 */
export function getRiskConfig(level) {
  const normalized = (level || 'LOW').toUpperCase();
  switch (normalized) {
    case 'CRITICAL':
      return {
        label: 'CRITICAL',
        color: '#ef4444',
        bgColor: 'rgba(239, 68, 68, 0.12)',
        borderColor: '#ef4444',
        textColor: '#f87171',
        icon: '🚨'
      };
    case 'HIGH':
      return {
        label: 'HIGH',
        color: '#f97316',
        bgColor: 'rgba(249, 115, 22, 0.12)',
        borderColor: '#f97316',
        textColor: '#fb923c',
        icon: '⚠️'
      };
    case 'MEDIUM':
      return {
        label: 'MEDIUM',
        color: '#eab308',
        bgColor: 'rgba(234, 179, 8, 0.12)',
        borderColor: '#eab308',
        textColor: '#fde047',
        icon: '⚡'
      };
    case 'LOW':
    default:
      return {
        label: 'LOW',
        color: '#10b981',
        bgColor: 'rgba(16, 185, 129, 0.12)',
        borderColor: '#10b981',
        textColor: '#34d399',
        icon: '🛡️'
      };
  }
}
