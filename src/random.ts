type RandomUint32 = () => number;

const platformRandomUint32: RandomUint32 = () => {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);

  const value = buffer[0];
  if (value === undefined) {
    throw new RangeError("platform random source returned no value");
  }

  return value;
};

export function cryptoRandomIndex(
  length: number,
  randomUint32: RandomUint32 = platformRandomUint32,
): number {
  if (!Number.isSafeInteger(length) || length <= 0 || length > 0x1_0000_0000) {
    throw new RangeError("length must be an integer between 1 and 2^32");
  }

  const range = 0x1_0000_0000;
  const rejectionLimit = Math.floor(range / length) * length;

  while (true) {
    const value = randomUint32();

    if (!Number.isInteger(value) || value < 0 || value > 0xffff_ffff) {
      throw new RangeError("random source must return an unsigned 32-bit integer");
    }

    if (value < rejectionLimit) {
      return value % length;
    }
  }
}
