const bytesToString = (hex: string): string => {
  const cleanHex = hex.replace(/^0x/, '');

  const bytes = new Uint8Array(
    cleanHex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || [],
  );

  const decoder = new TextDecoder();
  // eslint-disable-next-line no-control-regex
  return decoder.decode(bytes).replace(/\x00/g, '');
};

export { bytesToString };
