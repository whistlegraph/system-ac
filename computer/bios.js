// 📦 All Imports

import * as Loop from "./lib/loop.js";
import * as Pen from "./lib/pen.js";
import * as Graph from "./lib/graph.js";
import { randInt, dist } from "./lib/num.js";
import { apiObject } from "./lib/helpers.js";

// 🎬 Init Sequence

// 1. Set up the canvas or "screen" and define a framing algorithm.
const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");

let imageData;
let projectedWidth, projectedHeight;
let canvasRect;
let needsReframe = false;

const screen = apiObject("pixels", "width", "height");

function frame() {
  const subdivisions = 2 + window.devicePixelRatio;
  const width = Math.floor(window.innerWidth / subdivisions) - 8;
  const height = Math.floor(window.innerHeight / subdivisions) - 8;
  
  projectedWidth = width * subdivisions;
  projectedHeight = height * subdivisions;

  canvas.style.width = projectedWidth + "px";
  canvas.style.height = projectedHeight + "px";

  console.info(
    "Viewport:",
    width,
    height,
    "Window:",
    window.innerWidth,
    window.innerHeight
  );

  canvas.width = width;
  canvas.height = height;

  imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  Object.assign(screen, {
    pixels: imageData.data,
    width,
    height
  });

  Graph.setBuffer(screen);

  Graph.setColor(25, 25, 100);
  Graph.clear(25, 25, 100);
  ctx.putImageData(imageData, 0, 0);
  
  needsReframe = false;
}

// 2. Draw the first frame and add the canvas to the document.
frame();
document.body.append(canvas);
canvasRect = canvas.getBoundingClientRect();

// 3. Trigger it to re-draw whenever the window resizes.
let timeout;
window.addEventListener("resize", () => {
  window.clearTimeout(timeout); // Small timer to save on performance.
  timeout = setTimeout(() => {
    //frame();
    needsReframe = true;
  }, 500);
});

// 4. Set up sound output.
function startSound() {
  const audioContext = new AudioContext({
    latencyHint: "interactive",
    sampleRate: 44100
  });

  if (audioContext.state === "running") {
    audioContext.suspend();
  }

  (async () => {
    await audioContext.audioWorklet.addModule("computer/lib/speaker.js");
    const soundProcessor = new AudioWorkletNode(
      audioContext,
      "sound-processor"
    );
    soundProcessor.connect(audioContext.destination);
  })();

  window.addEventListener("pointerdown", async e => {
    if (["suspended", "interrupted"].includes(audioContext.state)) {
      audioContext.resume();
    }
  });
}

// TODO: Add mute
/*
function mute() {
  audioContext.suspend();
  // Or... audioContext.resume();
}
*/

// 5. Set-up "pen" input which also handles touch & pointer events.
function point(x, y) {
  // Map host display coordinate to the system screen.
  return {
    x: Math.floor(((x - canvasRect.x) / projectedWidth) * screen.width),
    y: Math.floor(((y - canvasRect.y) / projectedHeight) * screen.height)
  };
}

const pen = Pen.init(point);

// 6. Define a blank starter disk that just renders noise and plays a tone.
let disk = {
  update: function update() {},
  render: function render($) {
    const { screen, noise16 } = $;
    noise16();
  }
};

// 💾 Boot the system and load a disk.
async function boot(path, host = window.location.host) {
  // Try to load the disk as a worker first.
  // Safari and FF support is coming for worker module imports: https://bugs.webkit.org/show_bug.cgi?id=164860
  const worker = new Worker("./computer/lib/disk.js", { type: "module" });

  let send = e => worker.postMessage(e);
  let onMessage = loaded;
  worker.onmessage = e => onMessage(e);

  // Rewire things a bit if workers with modules are not supported (Safari & FF).
  worker.onerror = async e => {
    console.error("Disk worker failure. Trying to load disk into main thread.");
    const module = await import("./lib/disk.js");
    module.noWorker.postMessage = e => onMessage(e); // Define the disk's postMessage replacement.
    send = e => module.noWorker.onMessage(e); // Hook up our post method to disk's onmessage replacement.
    send({ path, host });
  };

  function loaded(e) {
    if (e.data.loaded === true) {
      console.log("💾 Loaded:", path, "🌐 from:", host);
      onMessage = receivedFrame;
      disk.requestFrame = requestFrame;
    }
  }

  // The initial message sends the path and host to load the disk.
  send({ path, host });

  // Update & Render
  let frameAlreadyRequested = false;
  let startTime;

  function requestFrame(needsRender, updateCount) {
   
    if (needsReframe) {
      frame();
    }
    
    if (frameAlreadyRequested) {
      // console.warn("Skipped frame.");
      return;
    }
    frameAlreadyRequested = true;

    startTime = performance.now();

    // Time budgeting stuff...
    //const updateDelta = performance.now() - updateNow;
    //console.log("Update Budget: ", Math.round((updateDelta / updateRate) * 100));
    // TODO: Output this number graphically.

    //const renderNow = performance.now();
    //const renderDelta = performance.now() - renderNow;
    //console.log("Render Budget: ", Math.round((renderDelta / renderRate) * 100));
    // TODO: Output this number graphically.

    send(
      {
        needsRender,
        updateCount,
        pixels: screen.pixels.buffer,
        width: canvas.width,
        height: canvas.height,
        pen
      },
      [screen.pixels.buffer]
    );
  }

  function receivedFrame(e) {
    // TODO: Use BitmapData objects to make this faster once it lands in Safari.
    
    imageData = new ImageData(
      new Uint8ClampedArray(e.data.pixels), // Is this the only necessary part?
      canvas.width,
      canvas.height 
    );

    screen.pixels = imageData.data;

    frameAlreadyRequested = false;

    if (e.data.didntRender === true) {
      return;
    }

    Graph.setBuffer(screen); // Why does screen exist here?

    pixelsDidChange = e.data.renderChanged;

    if (pixelsDidChange || pen.changed) {
      frameCached = false;
      Pen.render({ plot: Graph.plot, color: Graph.setColor });
      if (e.data.loading === true) renderLoadingSpinner();
      ctx.putImageData(imageData, 0, 0);
    } else if (frameCached === false) {
      frameCached = true;
      // Pause
      Graph.setColor(0, 255, 255);
      Graph.line(3, 3, 3, 9);
      Graph.line(6, 3, 6, 9);
      ctx.putImageData(imageData, 0, 0);
    } else if (e.data.loading === true) {
      renderLoadingSpinner();
      ctx.putImageData(imageData, 0, 0);
    }

    // TODO: Put this in a budget related to the current refresh rate.
    // TODO: Do renders always need to be requested?
    //console.log("🎨 MS:", (performance.now() - startTime).toFixed(1));
  }
}

function renderLoadingSpinner() { // TODO: Send the tickCount or time in here?
  Graph.setColor(255, 0, 0);
  Graph.line(0, 0, 10, 10);
  Graph.line(0, 10, 10, 0);
}

// ➰ Core Loops for User Input, Object Updates, and Rendering
function input() {
  Pen.input();
}

let frameCached = false;
let pixelsDidChange = false; // Can this whole thing be removed?

startSound();

Loop.start(input, function(needsRender, updateTimes) {
  // console.log(updateTimes); // Note: No updates happen yet before a render.
  if (disk.requestFrame) {
    // TODO: This is a little janky.
    disk.requestFrame(needsRender, updateTimes);
  }
});

export { boot };