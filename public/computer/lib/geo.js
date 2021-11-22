// 🧮 Geometry

export class Box {
  x = 0;
  y = 0;
  w = 1;
  h = 1;

  constructor(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;

    if (this.w === 0) this.w = 1;
    if (this.h === 0) this.h = 1;
  }

  // Yields a box where x, y is at the top left and w, h are positive.
  get abs() {
    let { x, y, w, h } = this;

    if (w < 0) {
      x += w;
      w = Math.abs(w);
    }

    if (h < 0) {
      y += h;
      h = Math.abs(h);
    }

    return new Box(x, y, w, h);
  }

  // Crops a box to another box.
  crop(toX, toY, toW, toH) {
    let { x, y, w, h } = this;

    // Crop left side.
    if (x < toX) {
      w += x;
      x = toX;
    }

    // Crop right side.
    if (x + w > toW) {
      w = toW - x;
    }

    // Crop top side.
    if (y < toY) {
      h += y;
      y = toY;
    }

    // Crop bottom side.
    if (y + h > toH) {
      h = toH - y;
    }

    return new Box(x, y, w, h);
  }

  // Moves the box by x and y.
  move({ x, y }) {
    this.x += x;
    this.y += y;
  }
}
