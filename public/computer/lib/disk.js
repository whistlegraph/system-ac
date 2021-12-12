// 👩‍💻 Disk

import * as graph from "./graph.js";
import * as num from "./num.js";
import * as geo from "./geo.js";
import * as ui from "./ui.js";

import * as help from "./help.js";

let boot = () => false;
let sim = () => false;
let paint = ($) => $.noise16();
let beat = () => false;
let act = ($) => false;

let loading = false;
let reframe;
let cursorCode;
let paintCount = 0n;

let penX, penY;

// 1. API

// For every function to access.
const $commonApi = {
  num: {
    randInt: num.randInt,
    randIntRange: num.randIntRange,
    dist: num.dist,
    radians: num.radians,
    lerp: num.lerp,
    Track: num.Track,
    vec4: num.vec4,
    vec3: num.vec3,
    mat4: num.mat4,
  },
  geo: {
    Box: geo.Box,
    Grid: geo.Grid,
  },
  ui: {
    Button: ui.Button,
  },
  help: {
    choose: help.choose,
    repeat: help.repeat,
    every: help.every,
    any: help.any,
    each: help.each,
  },
};

// Just for "update".
const $updateApi = {};

// Pre-fab models:
const SQUARE = {
  positions: [
    // Triangle 1 (Left Side)
    [-1, -1, 0, 1], // Bottom Left
    [-1, 1, 0, 1], // Top Left
    [1, 1, 0, 1], // Top Right
    // Triangle 2 (Right Side)
    [-1, -1, 0, 1], // Bottom Left
    [1, -1, 0, 1], // Bottom Right
    [1, 1, 0, 1], // Top Right
  ],
  indices: [
    // These are not re-used for now.
    // One
    0, 1, 2,
    //Two
    3, 4, 5,
  ],
};

const TRIANGLE = {
  positions: [
    [-1, -1, 0, 1], // Bottom Left
    [0, 1, 0, 1], // Top Left
    [1, -1, 0, 1], // Top Right
    // Triangle 2 (Right Side)
  ],
  indices: [0, 1, 2],
};

// Inputs: (r, g, b), (r, g, b, a) or an array of those.
//         (rgb) for grayscale or (rgb, a) for grayscale with alpha.
function ink() {
  let args = arguments;

  if (args.length === 1) {
    const isNumber = () => typeof args[0] === "number";
    const isArray = () => Array.isArray(args[0]);

    // If it's an object then randomly pick a value & re-run.
    if (!isNumber() && !isArray()) return ink(help.any(args[0]));

    // If single argument is a number then replicate it across the first 3 fields.
    if (isNumber()) {
      args = Array.from(args);
      args.push(args[0], args[0]);
    } else if (isArray()) {
      // Or if it's an array, then spread it out and re-ink.
      // args = args[0];
      return ink(...args[0]);
    }
  } else if (args.length === 2) {
    // rgb, a
    args = [arguments[0], arguments[0], arguments[0], arguments[1]];
  }

  graph.color(...args);
}

const $paintApi = {
  // Configuration
  ink: function () {
    ink(...arguments);
    return $paintApi;
  },
  pixels: graph.makeBuffer,
  setPixels: graph.setBuffer,
  pan: function () {
    graph.pan(...arguments);
    return $paintApi;
  },
  unpan: function () {
    graph.unpan();
    return $paintApi;
  },
  // 2D
  wipe: function () {
    if (arguments.length > 0) ink(...arguments);
    graph.clear();
    return $paintApi;
  },
  copy: graph.copy,
  paste: graph.paste,
  plot: function () {
    graph.plot(...arguments);
    return $paintApi;
  },
  line: function () {
    graph.line(...arguments);
    return $paintApi;
  },
  box: graph.box,
  grid: function () {
    graph.grid(...arguments);
    return $paintApi;
  },
  noise16: graph.noise16,
  // 3D
  Camera: graph.Camera,
  Form: graph.Form,
  TRIANGLE,
  SQUARE,
};

// 2. Loading the disk.
const { load, send } = (() => {
  let loadUrlCount = 1;
  let loadHost;

  async function load(path, host = loadHost, search) {
    if (loading === false) {
      loading = true;
    } else {
      // TODO: Implement some kind of loading screen system here?
      console.warn("Already loading another disk:", path);
      return;
    }

    console.log("💾 Loading:", path, "🌐 from:", host);

    // The `loadUrlCount` query parameter busts the cache so changes can be seen
    // if the disk code changes.
    const fullUrl = "https://" + host + "/" + path + ".js?lc=" + loadUrlCount;
    loadUrlCount += 1;

    const module = await import(fullUrl);
    loadHost = host;

    // Artificially imposed loading by at least 1/4 sec.
    setTimeout(() => {
      paintCount = 0n;
      // Redefine the default event functions if they exist in the module.
      boot = module.boot || boot;
      sim = module.sim || sim;
      paint = module.paint || paint;
      beat = module.beat || beat;
      act = module.act || act;
      $commonApi.query = search;
      $updateApi.load = load;
      loading = false;
    }, 100);
  }

  const isWorker = typeof importScripts === "function";
  const noWorker = { onMessage: undefined, postMessage: undefined };

  // Start by responding to a load message, then change
  // the message response to makeFrame.
  if (isWorker) {
    onmessage = async function (e) {
      await load(e.data.path, e.data.host, e.data.search);
      send({ loaded: true });
      onmessage = makeFrame;
    };
  } else {
    noWorker.onMessage = async (e) => {
      e = { data: e };
      await load(e.data.path, e.data.host, e.data.search);
      noWorker.onMessage = (d) => makeFrame({ data: d });
      send({ loaded: true });
    };
  }

  function send(data) {
    if (isWorker) {
      postMessage(data);
    } else {
      noWorker.postMessage({ data });
    }
  }

  return { load, send };
})();

// 3. Produce a frame.
// Boot procedure:
// First `paint` happens after `boot`, then any `act` and `sim`s each frame
// before `paint`ing occurs. (which is tied to display refresh right now but it
// could be manually triggered via `needsPaint();`). 2021.12.11.01.25
// TODO: Finish organizing e into e.data.type and e.data.content.
function makeFrame({ data: { type, content } }) {
  // 1. Beat // One send (returns afterwards)
  if (type === "beat") {
    const $api = {};
    Object.assign($api, $commonApi);
    $api.graph = $paintApi; // TODO: Should this eventually be removed?

    $api.sound = {
      time: content.time,
      bp: content.beatProgress,
      bpm: function (newBPM) {
        if (newBPM) {
          content.bpm[0] = newBPM;
        }
        return content.bpm[0];
      },
    };

    // TODO: Generalize this for other instruments.
    // TODO: Move this stuff to a "sound" module.
    const squares = [];

    $api.sound.square = function ({
      tone = 440, // TODO: Make random.
      beats = Math.random(), // Wow, default func. params can be random!
      attack = 0,
      decay = 0,
      volume = 1,
      pan = 0,
    } = {}) {
      squares.push({ tone, beats, attack, decay, volume, pan });

      // Return a progress function so it can be used by rendering.
      const seconds = (60 / content.bpm) * beats;
      const end = content.time + seconds;
      return {
        progress: function (time) {
          return 1 - Math.max(0, end - time) / seconds;
        },
      };
    };

    beat($api);

    send({ type: "beat", content: { bpm: content.bpm, squares } }, [
      content.bpm,
    ]);

    squares.length = 0;
  }

  // 2. Frame
  else if (type === "frame") {
    // Act & Sim (Occurs after first boot and paint.)
    if (paintCount > 0n) {
      const $api = {};
      Object.assign($api, $commonApi);
      Object.assign($api, $updateApi);

      $api.sound = { time: content.audioTime, bpm: content.audioBpm };

      // Don't pass pixels to updates.
      $api.screen = {
        width: content.width,
        height: content.height,
      };

      $api.cursor = (code) => (cursorCode = code);

      // 🌟 Act
      // Add download event to trigger a file download from the main thread.
      $api.download = (dl) => send({ type: "download", content: dl });

      // Ingest all pen input events by running act for each event.
      content.pen.forEach((data) => {
        Object.assign(data, { device: "pen", is: (e) => e === data.name });
        penX = data.x;
        penY = data.y;
        $api.event = data;
        act($api);
      });

      // TODO: Also process keyboard events. 2021.11.27.16.48

      // Remove $api elements that are not needed for `sim`.
      delete $api.event;
      delete $api.download;

      // 🤖 Sim // no send
      if (content.updateCount > 0 && paintCount > 0n) {
        // Update the number of times that are needed.
        for (let i = content.updateCount; i--; ) sim($api);
      }
    }

    // 🖼 Render // Two sends (Move one send up eventually? -- 2021.11.27.17.20)
    if (content.needsRender) {
      const $api = {};
      Object.assign($api, $commonApi);
      Object.assign($api, $paintApi);
      $api.paintCount = Number(paintCount);

      let pixels = new ImageData(
        new Uint8ClampedArray(content.pixels), // TODO: Is this the only necessary part?
        content.width,
        content.height
      );

      const screen = {
        pixels: pixels.data,
        width: content.width,
        height: content.height,
      };

      $api.screen = screen;

      $api.resize = function (width, height) {
        // Don't do anything if there is no change.
        if (screen.width === width && screen.height === height) return;

        screen.width = width;
        screen.height = height;
        screen.pixels = new Uint8ClampedArray(screen.width * screen.height * 4);
        graph.setBuffer(screen);
        reframe = { width, height };
      };

      $api.cursor = (code) => (cursorCode = code);
      $api.pen = { x: penX, y: penY };

      graph.setBuffer(screen);

      // Clear depthBuffer. TODO: This should only be for 3D?
      graph.depthBuffer.length = screen.width * screen.height;
      for (let i = 0; i < graph.depthBuffer.length; i += 1) {
        graph.depthBuffer[i] = Number.MAX_VALUE;
      }

      // Run boot only once before painting for the first time.
      if (paintCount === 0n) boot($api);

      // Paint a frame, which can return false to enable caching via paintChained and by
      // default returns undefined. -- Is this really what I want? 2021.11.27.16.20
      const paintChanged = paint($api) === false ? false : true;

      // Return frame data back to the main thread.
      const sendData = { pixels: screen.pixels };

      // Optional messages to send.
      if (paintChanged === true) sendData.paintChanged = true;
      if (loading === true) sendData.loading = true;

      // These fields are one time `signals`.
      if (reframe) sendData.reframe = reframe;
      if (cursorCode) sendData.cursorCode = cursorCode;

      send({ type: "render", content: sendData }, [screen.pixels]);

      paintCount = paintCount + 1n;

      // Flush the `signals` after sending.
      if (reframe) reframe = undefined;
      if (cursorCode) cursorCode = undefined;
    } else {
      // Send update (sim).
      send(
        {
          type: "update",
          content: { pixels: content.pixels, didntRender: true, loading },
        },
        [content.pixels]
      );
    }
  }
}
