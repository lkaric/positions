const formatWeiValue = (wei: bigint | boolean | number | string): bigint => {
  return (BigInt(wei) * BigInt(100000)) / BigInt(10 ** 18);
};

export { formatWeiValue };
