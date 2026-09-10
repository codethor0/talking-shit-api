export function cryptoRandomIndex(length: number): number {
  if (!Number.isSafeInteger(length) || length <= 0 || length > 0x1_0000_0000) {
    throw new RangeError("length must be an integer between 1 and 2^32");
  }

  const range = 0x1_0000_0000;
  const rejectionLimit = Math.floor(range / length) * length;
  const buffer = new Uint32Array(1);

  while (true) {
    crypto.getRandomValues(buffer);
    const value = buffer[0];
    if (value !== undefined && value < rejectionLimit) {
      return value % length;
    }
  }
}
