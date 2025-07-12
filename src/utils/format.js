export const formatCurrency = (value) => {
  if (isNaN(value)) return "₱0.00";
  return `₱${value.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};
