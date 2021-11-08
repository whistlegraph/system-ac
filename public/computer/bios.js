// 📦 All Imports
import * as Loop from "./lib/loop.js";
import * as Pen from "./lib/pen.js";
import * as Graph from "./lib/graph.js";
import * as UI from "./lib/ui.js";
import { apiObject } from "./lib/helpers.js";

// 💾 Boot the system and load a disk.
async function boot(
  path = "index",
  bpm = 60,
  host = window.location.host,
  resolution
) {
  // Define a blank starter disk that just renders noise and plays a tone.
  const disk = {};

  // 1. Rendering
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  let imageData;
  let fixedWidth, fixedHeight;
  let projectedWidth, projectedHeight;
  let canvasRect;
  let needsReframe = false;

  const screen = apiObject("pixels", "width", "height");

  function frame(width, height) {
    width = width || fixedWidth;
    height = height || fixedHeight;

    if (width === undefined && height === undefined) {
      // Automatically set and frame a reasonable resolution.
      const subdivisions = 2 + window.devicePixelRatio;
      width = Math.floor(window.innerWidth / subdivisions) - 8;
      height = Math.floor(window.innerHeight / subdivisions) - 8;
      projectedWidth = width * subdivisions;
      projectedHeight = height * subdivisions;
    } else {
      // Or do it manually if both width and height are defined.
      fixedWidth = width;
      fixedHeight = height;

      const ratio = width / height;
      const pixelGap = 3;

      if (window.innerHeight > window.innerWidth) {
        const gapSize = (window.innerWidth / width) * 2 * pixelGap;
        projectedWidth = window.innerWidth - gapSize;
        projectedHeight = window.innerWidth * ratio - gapSize;
      } else {
        const gapSize = (window.innerHeight / height) * 2 * pixelGap;
        projectedWidth = window.innerHeight * ratio - gapSize;
        projectedHeight = window.innerHeight - gapSize;
      }
    }

    // Store any pre-written imageData, in case of reframing.
    const storedImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

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

    // Paste stored imageData back.
    ctx.putImageData(storedImageData, 0, 0);

    imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    Object.assign(screen, {
      pixels: imageData.data,
      width,
      height,
    });

    if (fixedWidth === undefined && fixedHeight === undefined) {
      Graph.setBuffer(screen);
      Graph.color(25, 25, 100);
      Graph.clear(25, 25, 100);
      ctx.putImageData(imageData, 0, 0);
    }

    if (!document.body.contains(canvas)) {
      document.body.append(canvas);
      // Trigger it to re-draw whenever the window resizes.
      let timeout;
      window.addEventListener("resize", () => {
        window.clearTimeout(timeout); // Small timer to save on performance.
        timeout = setTimeout(() => {
          needsReframe = true;
        }, 500);
      });
    }

    canvasRect = canvas.getBoundingClientRect();
    needsReframe = false;
  }

  // 2. Audio
  const sound = {
    bpm: new Float32Array(1),
  };
  let updateMetronome, updateSquare, audioContext;

  function startSound() {
    audioContext = new AudioContext({
      latencyHint: "interactive",
      sampleRate: 44100,
    });

    if (audioContext.state === "running") {
      audioContext.suspend();
    }

    (async () => {
      await audioContext.audioWorklet.addModule("computer/lib/speaker.js");
      const soundProcessor = new AudioWorkletNode(
        audioContext,
        "sound-processor",
        { outputChannelCount: [2], processorOptions: { bpm: sound.bpm[0] } }
      );

      updateMetronome = function (newBPM) {
        soundProcessor.port.postMessage({
          type: "new-bpm",
          data: newBPM,
        });
      };

      updateSquare = function (square) {
        soundProcessor.port.postMessage({
          type: "square",
          data: square,
        });
      };

      soundProcessor.port.onmessage = (e) => {
        const time = e.data;
        disk.requestBeat?.(time);
      };

      soundProcessor.connect(audioContext.destination);
    })();

    window.addEventListener("pointerdown", async () => {
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

  // Grab query parameters.
  const search = new URL(self.location).search;

  // Try to load the disk boilerplate as a worker first.
  // Safari and FF support is coming for worker module imports: https://bugs.webkit.org/show_bug.cgi?id=164860
  const worker = new Worker("./computer/lib/disk.js", { type: "module" });

  let send = (e) => worker.postMessage(e);
  let onMessage = loaded;
  worker.onmessage = (e) => onMessage(e);

  // Rewire things a bit if workers with modules are not supported (Safari & FF).
  worker.onerror = async () => {
    console.error("Disk worker failure.");
    const module = await import("./lib/disk.js");
    module.noWorker.postMessage = (e) => onMessage(e); // Define the disk's postMessage replacement.
    send = (e) => module.noWorker.onMessage(e); // Hook up our post method to disk's onmessage replacement.
    send({ path, host, search });
  };

  function loaded(e) {
    if (e.data.loaded === true) {
      console.log("💾 Loaded:", path, "🌐 from:", host);
      onMessage = receivedChange;
      disk.requestBeat = requestBeat;
      disk.requestFrame = requestFrame;
    }
  }

  // The initial message sends the path and host to load the disk.
  send({ path, host, search });

  // Beat

  // Set the default bpm.
  sound.bpm.fill(bpm);

  function requestBeat(time) {
    send(
      {
        needsBeat: true,
        time,
        bpm: sound.bpm,
        pixels: screen.pixels.buffer,
        width: canvas.width,
        height: canvas.height,
        pen,
      },
      [sound.bpm, screen.pixels.buffer]
    );
  }

  function receivedBeat(e) {
    // BPM
    if (sound.bpm[0] !== e.data.bpm[0]) {
      sound.bpm = new Float32Array(e.data.bpm);
      updateMetronome(sound.bpm[0]);
    }

    // SQUARE
    for (const square of e.data.squares) {
      updateSquare(square);
    }
  }

  // Update & Render
  let frameAlreadyRequested = false;
  let startTime;

  function requestFrame(needsRender, updateCount) {
    if (needsReframe) frame();

    if (frameAlreadyRequested) return;
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

    // makeFrame
    send(
      {
        needsRender,
        updateCount,
        audioTime: audioContext?.currentTime,
        pixels: screen.pixels.buffer,
        width: canvas.width,
        height: canvas.height,
        pen,
        //updateMetronome,
      },
      [screen.pixels.buffer]
    );
  }

  let frameCached = false;
  let pixelsDidChange = false; // Can this whole thing be removed?

  function receivedChange(e) {
    // Route to received beat if this change is not a frame update.
    if (e.data.bpm) {
      receivedBeat(e);
      return;
    }

    // Check for a change in resolution.
    if (e.data.reframe) {
      // Reframe the captured pixels.
      frame(e.data.reframe.width, e.data.reframe.height);
    }

    // Grab the pixels.
    // TODO: Use BitmapData objects to make this faster once it lands in Safari.
    imageData = new ImageData(
      new Uint8ClampedArray(e.data.pixels), // Is this the only necessary part?
      canvas.width,
      canvas.height
    );

    screen.pixels = imageData.data;

    frameAlreadyRequested = false;

    if (e.data.didntRender === true) return;

    Graph.setBuffer(screen); // Why does screen exist here?

    pixelsDidChange = e.data.paintChanged;

    if (pixelsDidChange || pen.changed) {
      frameCached = false;

      Pen.render({ plot: Graph.plot, color: Graph.color });

      if (e.data.loading === true) UI.spinner(Graph);

      ctx.putImageData(imageData, 0, 0);
    } else if (frameCached === false) {
      frameCached = true;
      // Pause
      Graph.color(0, 255, 255);
      Graph.line(3, 3, 3, 9);
      Graph.line(6, 3, 6, 9);
      ctx.putImageData(imageData, 0, 0);
    } else if (e.data.loading === true) {
      UI.spinner(Graph);
      ctx.putImageData(imageData, 0, 0);
    }

    // TODO: Put this in a budget related to the current refresh rate.
    // TODO: Do renders always need to be requested?
    //console.log("🎨 MS:", (performance.now() - startTime).toFixed(1));
  }

  // Pen (also handles touch & pointer events)
  const pen = Pen.init((x, y) => {
    return {
      x: Math.floor(((x - canvasRect.x) / projectedWidth) * screen.width),
      y: Math.floor(((y - canvasRect.y) / projectedHeight) * screen.height),
    };
  });

  // Display
  frame(resolution?.width, resolution?.height);

  // Sound
  startSound(); // This runs disk.beat

  // ➰ Core Loops for User Input, Music, Object Updates, and Rendering
  Loop.start(
    () => {
      Pen.input();
      // TODO: Key.input();
      // TODO: Voice.input();
    },
    function (needsRender, updateTimes) {
      // console.log(updateTimes); // Note: No updates happen yet before a render.
      disk.requestFrame?.(needsRender, updateTimes);
    }
  );
}

export { boot };
