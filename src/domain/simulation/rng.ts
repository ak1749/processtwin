/** A small deterministic PRNG; the same seed always yields the same sequence. */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export function sampleTriangular(random: () => number, min: number, typical: number, max: number): number {
  if (min === max) return min;
  const sample = random();
  const split = (typical - min) / (max - min);
  return sample <= split
    ? min + Math.sqrt(sample * (max - min) * (typical - min))
    : max - Math.sqrt((1 - sample) * (max - min) * (max - typical));
}

export function sampleExponential(random: () => number, mean: number): number {
  if (mean <= 0) return 0;
  return -Math.log(1 - random()) * mean;
}
