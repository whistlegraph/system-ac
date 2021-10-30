import * as num from "./num.js";

// Randomly returns one of the arguments.
export function choose() {
  return arguments[num.randInt(arguments.length - 1)];
}

// Set every property of an object to a certain value.
export function every(obj, value) {
  Object.keys(obj).forEach((k) => (obj[k] = value));
}

// Run a function on every value in an object.
// Ex. each(obj, (value, key) => console.log(value, key));
export function each(obj, fn) {
  Object.entries(obj).forEach(([key, obj]) => fn(obj, key));
}
