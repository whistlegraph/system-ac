import * as num from "./num.js";

export function choose() {
  return arguments[num.randInt(arguments.length - 1)];
}
