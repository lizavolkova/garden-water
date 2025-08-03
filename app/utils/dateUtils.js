// Utility function to get local date in YYYY-MM-DD format (client timezone)
export function getLocalDateString(date = new Date()) {
  // Use the user's local timezone, not server timezone
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const isToday = (dateString) => {
  if (typeof window === 'undefined') return false;
  const today = getLocalDateString();
  return dateString === today;
};

export const isPastDate = (dateString) => {
  if (typeof window === 'undefined') return false;
  const today = getLocalDateString();
  return dateString < today;
};