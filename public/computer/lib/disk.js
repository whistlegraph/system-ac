import * as graph from "./graph.js";
import * as num from "./num.js";
import * as help from "./help.js";

// 👩‍💻 API (Available for disks to access.)

const $commonApi = {
  num: {
    randInt: num.randInt,
    randIntRange: num.randIntRange,
    dist: num.dist,
  },
  help: {
    choose: help.choose,
  },
};

const $updateApi = {
  load,
};

const $renderApi = {
  color: graph.setColor,
  plot: graph.plot,
  line: graph.line,
  clear: graph.clear,
  noise16: graph.noise16,
};

let loading = false;

function makeFrame(e) {
  // TODO:
  /*
  switch(e.data.frameType) {
  case: "beat"
  case: "update"
  case: "render"
  }
   */

  // Split off two different APIs for update and render.

  let $api = {};

  // Common API
  Object.assign($api, $commonApi);
  $api.penChanged = e.data.penChanged;

  // Beat
  if (e.data.needsBeat) {
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

    // Add the ability to send multiple squares in one beat.

    $api.sound.square = function (
      tone,
      duration = Math.random(), // Wow, default func. params can be random!
      attack = 0,
      decay = 0,
      volume = 1,
      pan = 0
    ) {
      squares.push({ tone, duration, attack, decay, volume, pan });

      // Return a progress function so it can be used by rendering.
      const seconds = (60 / e.data.bpm) * duration;
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

  // Update
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
    update($api);
  }

  if (e.data.needsRender) {
    $api = {};

    // Common API
    Object.assign($api, $commonApi);
    $api.penChanged = e.data.penChanged;

    // Render
    Object.assign($api, $renderApi);

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

    const renderResult = render($api);
    let renderChanged;

    if (renderResult === false) {
      renderChanged = false;
    } else {
      renderChanged = true;
    }

    send({ pixels: e.data.pixels, renderChanged, loading }, [e.data.pixels]);
  } else {
    send({ pixels: e.data.pixels, didntRender: true, loading }, [
      e.data.pixels,
    ]);
  }
}

let beat = () => false;
let update = () => false;
let render = () => false;

let loadUrlCount = 1;
let loadHost;

async function load(path, host = loadHost) {
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

  beat = module.beat;
  update = module.update;
  render = module.render;

  loading = false;
}

const isWorker = typeof importScripts === "function";
export const noWorker = { onMessage: undefined, postMessage: undefined };

// Start by responding to a load message, then change
// the message response to makeFrame.
if (isWorker) {
  onmessage = async function (e) {
    await load(e.data.path, e.data.host);
    send({ loaded: true });
    onmessage = makeFrame;
  };
} else {
  noWorker.onMessage = async (e) => {
    e = { data: e };
    await load(e.data.path, e.data.host);
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
