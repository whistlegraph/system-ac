// ✍️Pen

// TODO: Clean up this whole class and its connections to the system.

export class Pen {
  x;
  y;
  down = false;
  changed = false;

  cursorCode;
  penCursor = false;

  lastPenX;
  lastPenY;
  lastPenDown;
  lastPenCursor;

  penDragging = false;

  isDown = false;

  penLastPos;

  penDragStartPos;

  dragBox;

  constructor(point) {
    // Prevent touch events from scrolling the page.
    function absorbEvent(e) {
      e.stopPropagation();
      e.preventDefault();
      e.returnValue = false;
    }

    // Add pointer events.
    const pen = this;

    window.addEventListener("pointermove", function (e) {
      if (!e.isPrimary) return;
      Object.assign(pen, point(e.x, e.y));
      pen.penCursor = true;
      if (e.pointerType !== "mouse") pen.penCursor = false;
    });

    window.addEventListener("pointerdown", function (e) {
      if (!e.isPrimary) return;
      Object.assign(pen, point(e.x, e.y));
      pen.down = true;
      pen.penCursor = true;
      if (e.pointerType !== "mouse") pen.penCursor = false;
    });

    window.addEventListener("pointerup", function (e) {
      if (!e.isPrimary) return;
      pen.down = false;
      if (e.pointerType !== "mouse") pen.penCursor = false;
    });

    return pen;
  }

  // TODO: Merge this logic into the above events & consolidate class properties.
  // Check the hardware for any changes.
  poll() {
    if (this.down) {
      if (this.penDragging === false) {
        this.penDragging = true;

        this.penDragStartPos = { x: this.x, y: this.y };
        this.penLastPos = { x: this.x, y: this.y };

        this.event = "touch";
      } else if (this.penDragging === true) {
        const penDragAmount = {
          x: this.x - this.penDragStartPos.x,
          y: this.y - this.penDragStartPos.y,
        };

        const penDragDelta = {
          x: this.x - this.penLastPos.x,
          y: this.y - this.penLastPos.y,
        };

        this.penLastPos = { x: this.x, y: this.y };

        this.dragBox = {
          x: this.penDragStartPos.x,
          y: this.penDragStartPos.y,
          w: penDragAmount.x,
          h: penDragAmount.y,
        };
        this.dragDelta = penDragDelta;
        this.lastPos = this.penLastPos;
        this.event = "draw";
      }
    } else if (this.penDragging === true) {
      this.event = "lift";
      this.penDragging = false;
    }

    this.isDown = this.penDragging;

    if (
      this.x !== this.lastPenX ||
      this.y !== this.lastPenY ||
      this.down !== this.lastPenDown ||
      this.penCursor !== this.lastPenCursor
    ) {
      this.changed = true;
      this.lastPenCursor = this.penCursor;
      this.lastPenDown = this.down;
      this.lastPenX = this.x;
      this.lastPenY = this.y;
    }
    // TODO: "Wait until after rendering to set changed to false so those functions will check it?" - Why would I *not* do that here?
  }

  render({ plot, color }) {
    const { x, y } = this;
    if (!this.cursorCode || this.cursorCode === "precise") {
      color(255, 255, 255);
      // Center
      plot(x, y);
      // Crosshair
      color(0, 255, 255);

      // Over
      plot(x, y - 2);
      plot(x, y - 3);
      // Under
      plot(x, y + 2);
      plot(x, y + 3);
      // Left
      plot(x - 2, y);
      plot(x - 3, y);
      // Right
      plot(x + 2, y);
      plot(x + 3, y);
    } else if (this.cursorCode === "tiny") {
      color(255, 255, 0, 200);
      plot(x - 1, y);
      plot(x + 1, y);
      // plot(pen.x, pen.y);
      plot(x, y - 1);
      plot(x, y + 1);
    } else if (this.cursorCode === "dot") {
      // ...
      color(255, 0, 0, 128);
      plot(x, y);
    } else if (this.cursorCode === "none") {
      // ...
    }
    this.changed = false;
  }

  setCursorCode(code) {
    this.cursorCode = code;
  }
}
