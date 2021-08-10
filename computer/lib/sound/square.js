export const gap = {
  max: 1024,
  step: 0
}

export function gen() {
  if (gap.step < gap.max) {
    gap.step += 1;
    return 1.0;
  } else {
    gap.step = 0;
    return -1.0;
  }
}