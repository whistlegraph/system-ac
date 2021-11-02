import * as graph from "./graph.js";
import * as num from "./num.js";
import * as help from "./help.js";
import { makeBuffer } from "./graph.js";

let boot = () => false;
let sim = () => false;
let paint = ($) => $.noise16();
let beat = () => false;
// let query = ""; // Passing in original URL parameters.

let loading = false;
let paintCount = 0n;

// Load the disk.
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

    // The `loadUrlCount` query parameter busts the cache so changes can be seen if the disk code changes.
    const fullUrl = "https://" + host + "/" + path + ".js?lc=" + loadUrlCount;
    loadUrlCount += 1;

    const module = await import(fullUrl);
    loadHost = host;

    // Artificially imposed loading by at least 1/4 sec.
    setTimeout(() => {
      paintCount = 0n;
      boot = module.boot;
      sim = module.sim;
      paint = module.paint;
      beat = module.beat;
      //query = search;
      $commonApi.query = search;
      loading = false;
    }, 250);
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

// 👩‍💻 Disk API

// For every function to access.
const $commonApi = {
  num: {
    randInt: num.randInt,
    randIntRange: num.randIntRange,
    dist: num.dist,
    radians: num.radians,
    lerp: num.lerp,
    Track: num.Track,
    boxNormal: num.boxNormal,
    vec4: num.vec4,
    vec3: num.vec3,
    mat4: num.mat4,
  },
  help: {
    choose: help.choose,
    every: help.every,
    each: help.each,
  },
};

// Just for "update".
const $updateApi = {
  load,
};

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

const $paintApi = {
  // Configuration
  color: graph.color,
  buffer: graph.makeBuffer,
  setBuffer: graph.setBuffer,
  // 2D
  clear: graph.clear,
  copy: graph.copy,
  plot: graph.plot,
  line: graph.line,
  box: graph.box,
  noise16: graph.noise16,
  // 3D
  Camera: graph.Camera,
  Form: graph.Form,
  TRIANGLE,
  SQUARE,
};

function makeFrame(e) {
  // 1. Beat
  if (e.data.needsBeat) {
    const $api = {};
    Object.assign($api, $commonApi);
    $api.graph = $paintApi; // TODO: Should this eventually be removed?

    $api.sound = {
      time: e.data.time,
      bpm: function (newBPM) {
        if (newBPM) {
          e.data.bpm[0] = newBPM;
        }
        return e.data.bpm[0];
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
      const seconds = (60 / e.data.bpm) * beats;
      const end = e.data.time + seconds;
      return {
        progress: function (time) {
          return 1 - Math.max(0, end - time) / seconds;
        },
      };
    };

    beat($api);

    send({ bpm: e.data.bpm, squares }, [e.data.bpm]);

    squares.length = 0;

    return;
  }

  // 2. Update
  if (e.data.updateCount > 0 && paintCount > 0n) {
    const $api = {};
    Object.assign($api, $commonApi);
    Object.assign($api, $updateApi);

    $api.sound = {
      time: e.data.audioTime,
    };

    // Don't pass pixels to updates.
    $api.screen = {
      width: e.data.width,
      height: e.data.height,
    };

    $api.pen = e.data.pen;
    // $api.updateMetronome = e.data.updateMetronome;

    // Update the number of times that are needed.
    for (let i = e.data.updateCount; i--; ) {
      sim($api);
    }
  }

  // 3. Render
  if (e.data.needsRender) {
    const $api = {};
    Object.assign($api, $commonApi);
    Object.assign($api, $paintApi);
    $api.paintCount = Number(paintCount);

    let pixels = new ImageData(
      new Uint8ClampedArray(e.data.pixels), // Is this the only necessary part?
      e.data.width,
      e.data.height
    );

    const screen = {
      pixels: pixels.data,
      width: e.data.width,
      height: e.data.height,
    };

    $api.screen = screen;

    $api.pen = e.data.pen;

    graph.setBuffer(screen);

    // Clear depthBuffer. TODO: This should only be for 3D?
    graph.depthBuffer.length = screen.width * screen.height;
    for (let i = 0; i < graph.depthBuffer.length; i += 1) {
      graph.depthBuffer[i] = Number.MAX_VALUE;
    }

    if (paintCount === 0n) {
      boot($api);
    }

    const paintResult = paint($api);
    let paintChanged;

    if (paintResult === false) {
      paintChanged = false;
    } else {
      paintChanged = true;
    }

    send({ pixels: e.data.pixels, paintChanged, loading }, [e.data.pixels]);

    paintCount = paintCount + 1n;
  } else {
    send({ pixels: e.data.pixels, didntRender: true, loading }, [
      e.data.pixels,
    ]);
  }
}
