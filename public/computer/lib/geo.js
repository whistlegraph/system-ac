// 🧮 Geometry

const { floor } = Math;

// A dynamic box defined by x, y, w, h with mutable methods.
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
    if (x + w > toW) w = toW - x;
    // Crop top side.
    if (y < toY) {
      h += y;
      y = toY;
    }
    // Crop bottom side.
    if (y + h > toH) h = toH - y;

    return new Box(x, y, w, h);
  }

  // Moves the box by x and y.
  move({ x, y }) {
    this.x += x;
    this.y += y;
  }

  contains({ x, y }) {
    return (
      this.x <= x && x < this.x + this.w && this.y <= y && y < this.y + this.h
    );
  }
}

// A 2 dimensional uniform grid, using a box as the frame (with scaling).
export class Grid {
  box;
  scale;
  scaled;

  constructor(x, y, w, h, s) {
    // Takes the same arguments as box.
    this.box = new Box(x, y, w, h);
    this.scale = s;

    this.scaled = new Box(
      this.box.x,
      this.box.y,
      this.box.w * this.scale,
      this.box.h * this.scale
    );
  }

  // Returns unscaled point `{x, y}` in `grid` for given display coordinate `pos`,
  // or `false` if `pos` is outside of `grid`.
  squareUnder({ x, y }) {
    if (this.scaled.contains({ x, y })) {
      return {
        x: this.box.x + floor((x - this.box.x) / this.scale) * this.scale,
        y: this.box.y + floor((y - this.box.y) / this.scale) * this.scale,
        w: this.scale,
        h: this.scale,
      };
    } else return false;
  }

  // Find exact center point of grid square if possible, otherwise return 0.
  // (starting at 3x3, and only including perfect centers)
  get squareCenter() {
    const halfScale = this.scale / 2;
    if (halfScale % 1 === 0.5 && halfScale > 0.5) {
      return floor(halfScale);
    } else {
      return 0;
    }
  }
}
