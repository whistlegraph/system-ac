// 🧮 Geometry

export class Box {
  x = 0;
  y = 0;
  w = 0;
  h = 0;

  constructor(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
  }

  // Adjusts a box so that x, y is always the top left and the box has a min
  // width and height of 1.
  get fromTopLeft() {
    let { x, y, w, h } = this;

    // Make sure w and h are at least 1.
    if (w < 0) {
      w -= 1;
      x += 1;
    } else if (w >= 0) {
      w += 1;
    }

    if (h < 0) {
      h -= 1;
      y += 1;
    } else if (h >= 0) {
      h += 1;
    }

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

  croppedTo(toX, toY, toW, toH) {
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
}
