const formatNumber = (value: number, decimals: number) => {
  if (Math.abs(value) < 200000) {
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: decimals,
      minimumFractionDigits: decimals,
    }).format(value);
  }

  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(value);
};

export { formatNumber };
