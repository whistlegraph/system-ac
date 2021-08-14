import { randInt, byteInterval17 } from "./num.js";

let width, height, pixels;
const color = [255, 255, 255, 255];

function setColor(r, g, b, a = 255) {
  color[0] = r;
  color[1] = g;
  color[2] = b;
  color[3] = a;
}

function setBuffer(screen) {
  ({ width, height, pixels } = screen);
}

function line(x0, y0, x1, y1) {
  // Bresenham's Algorithm
  var dx = Math.abs(x1 - x0);
  var dy = Math.abs(y1 - y0);
  var sx = x0 < x1 ? 1 : -1;
  var sy = y0 < y1 ? 1 : -1;
  var err = dx - dy;

  while (true) {
    plot(x0, y0); // Do what you need to for this

    if (x0 === x1 && y0 === y1) break;
    var e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      y0 += sy;
    }
  }
}

function plot(x, y) {
  // Skip pixels that are offscreen.
  if (x < 0 || x >= width || y < 0 || y >= height) {
    return;
  }

  // Plot our pixel.
  const i = (x + y * width) * 4;
  pixels[i] = color[0];
  pixels[i + 1] = color[1];
  pixels[i + 2] = color[2];
  pixels[i + 3] = color[3];
}

function clear() {
  /*
  // Note: I believe this would be the fastest method but would have to test it.
  // Would have to copy up by doubling until we hit the length!
  pixels[0] = 255;
  pixels[1] = 255;
  pixels[2] = 255;
  pixels[3] = 255;
  
  pixels.copyWithin(4, 0);
  */

  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = color[0]; // r
    pixels[i + 1] = color[1]; // g
    pixels[i + 2] = color[2]; // b
    pixels[i + 3] = color[3]; // alpha
  }
}

function noise16() {
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = byteInterval17(randInt(16)); // r
    pixels[i + 1] = byteInterval17(randInt(16)); // g
    pixels[i + 2] = byteInterval17(randInt(16)); // b
    pixels[i + 3] = 255; // a
  }
}

export { setBuffer, setColor, line, plot, clear, noise16 };
