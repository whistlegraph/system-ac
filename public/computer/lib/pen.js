// ✍️ Pen

// Note: This is currently a singleton with an init function and some exported
// functions that act on one instance.

const pen = {
  x: undefined,
  y: undefined,
  down: false,
  changed: false,
};

let cursorCode;
let penCursor = false;
let lastPenX, lastPenY, lastPenDown, lastPenCursor;

export function init(point) {
  // Prevent touch events from scrolling the page.
  function absorbEvent(e) {
    e.stopPropagation();
    e.preventDefault();
    e.returnValue = false;
  }

  // window.addEventListener("touchstart", absorbEvent);
  // window.addEventListener("touchend", absorbEvent);
  // window.addEventListener("touchmove", absorbEvent);
  // window.addEventListener("touchcancel", absorbEvent);

  // Add pointer events.

  window.addEventListener("pointermove", function (e) {
    if (!e.isPrimary) return;
    Object.assign(pen, point(e.x, e.y));
    penCursor = true;
    if (e.pointerType !== "mouse") penCursor = false;
  });

  window.addEventListener("pointerdown", function (e) {
    if (!e.isPrimary) return;
    Object.assign(pen, point(e.x, e.y));
    pen.down = true;
    penCursor = true;
    if (e.pointerType !== "mouse") penCursor = false;
  });

  window.addEventListener("pointerup", function (e) {
    if (!e.isPrimary) return;
    pen.down = false;
    if (e.pointerType !== "mouse") penCursor = false;
  });

  return pen;
}

export function input() {
  if (
    pen.x !== lastPenX ||
    pen.y !== lastPenY ||
    pen.down !== lastPenDown ||
    penCursor !== lastPenCursor
  ) {
    pen.changed = true;
    lastPenCursor = penCursor;
    lastPenDown = pen.down;
    lastPenX = pen.x;
    lastPenY = pen.y;
  }
  // Wait until after rendering to set changed to false, because other render functions may check it.
}

export function render({ plot, color }) {
  if (!penCursor) return;

  if (!cursorCode) {
    color(255, 255, 255);

    // Center
    plot(pen.x, pen.y);

    // Crosshair
    color(0, 255, 255);

    // Over
    plot(pen.x, pen.y - 2);
    plot(pen.x, pen.y - 3);
    // Under
    plot(pen.x, pen.y + 2);
    plot(pen.x, pen.y + 3);
    // Left
    plot(pen.x - 2, pen.y);
    plot(pen.x - 3, pen.y);
    // Right
    plot(pen.x + 2, pen.y);
    plot(pen.x + 3, pen.y);
  } else if (cursorCode === "tiny") {
    color(255, 255, 0, 200);
    plot(pen.x - 1, pen.y);
    plot(pen.x + 1, pen.y);
    // plot(pen.x, pen.y);
    plot(pen.x, pen.y - 1);
    plot(pen.x, pen.y + 1);
  } else if (cursorCode === "dot") {
    // ...
    color(255, 255, 255, 128);
    plot(pen.x, pen.y);
  } else if (cursorCode === "none") {
    // ...
  }

  pen.changed = false;
}

export function setCursorCode(code) {
  cursorCode = code;
}
