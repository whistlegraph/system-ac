// ✍️ Pen

// Note: This is currently a singleton with an init function and some exported
// functions that act on one instance.

const pen = {
  x: undefined,
  y: undefined,
  down: false,
  changed: false
};

let penCursor = false;
let lastPenX, lastPenY, lastPenDown, lastPenCursor;

export function init(point) {
  // Prevent touch events from scrolling the page.
  function absorbEvent(e) {
    e.stopPropagation();
    e.preventDefault();
    e.returnValue = false;
  }

  window.addEventListener("touchstart", absorbEvent);
  window.addEventListener("touchend", absorbEvent);
  window.addEventListener("touchmove", absorbEvent);
  window.addEventListener("touchcancel", absorbEvent);

  // Add pointer events.

  window.addEventListener("pointermove", function(e) {
    Object.assign(pen, point(e.x, e.y));
    penCursor = true;
  });

  window.addEventListener("pointerdown", function(e) {
    Object.assign(pen, point(e.x, e.y));
    pen.down = true;
    penCursor = true;
  });

  window.addEventListener("pointerup", function(e) {
    pen.down = false;

    if (e.pointerType === "touch") {
      penCursor = false;
    }
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

export function render($) {
  const { plot, color } = $;

  if (penCursor) {
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
  }
  
  pen.changed = false;
}