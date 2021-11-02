// 🧮 Numbers
import { vec4, mat4 } from "../dep/gl-matrix/index.js";

export { vec4, mat4 };

// Accepts integer from 0–16
// Yields 17 different values between 0–255.
export function byteInterval17(i16) {
  return Math.min(i16 * 16, 255);
}

// Generates an integer from 0-n (inclusive)
export function randInt(n) {
  return Math.floor(Math.random() * (n + 1));
}

// Generates an integer from low-high (inclusive)
export function randIntRange(low, high) {
  return low + randInt(high - low);
}

// Gets the distance between two points.
export function dist(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

// Converts degrees to radians.
export function radians(deg) {
  return deg * (Math.PI / 180);
}

// Keeps a value between min and max.
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// Slides a number between a and by a normalized amount.
export function lerp(a, b, amount) {
  return a + (b - a) * clamp(amount, 0, 1);
}

// Wraps a single lerped value into a class.
export class Track {
  #from;
  #to;
  #result;

  constructor(from, to, result) {
    this.#from = from;
    this.#to = to;
    this.#result = result;
  }

  step(progress) {
    this.#result(lerp(this.#from, this.#to, progress));
  }
}

// Adjusts a box so that x, y is always the top left.
export function boxNormal(x, y, w, h) {
  if (w < 0) {
    x += w;
    w = Math.abs(w);
  }

  if (h < 0) {
    y += h;
    h = Math.abs(h);
  }

  return { x, y, w, h };
}
