import * as graph from "./graph.js";
import * as num from "./num.js";

// 👩‍💻 API (Available for disks to access.)

const $commonApi = {
  num: {
    randInt: num.randInt,
    dist: num.dist
  }
};

const $updateApi = {
  load
};

const $renderApi = {
  color: graph.setColor,
  plot: graph.plot,
  line: graph.line,
  clear: graph.clear,
  noise16: graph.noise16
};

let loading = false;

function makeFrame(e) {
  // Split off two different APIs for update and render.

  let $api = {};

  // Common API
  Object.assign($api, $commonApi);
  $api.penChanged = e.data.penChanged;

  // Update
  Object.assign($api, $updateApi);

  // Don't pass pixels to updates.
  $api.screen = {
    width: e.data.width,
    height: e.data.height
  };

  $api.pen = e.data.pen;

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
      height: e.data.height
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
    send({ pixels: e.data.pixels, didntRender: true, loading }, [e.data.pixels]);
  }
}

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

  update = module.update;
  render = module.render;

  loading = false;
}

const isWorker = typeof importScripts === "function";
export const noWorker = { onMessage: undefined, postMessage: undefined };

// Start by responding to a load message, then change
// the message response to makeFrame.
if (isWorker) {
  onmessage = async function(e) {
    await load(e.data.path, e.data.host);
    send({ loaded: true });
    onmessage = makeFrame;
  };
} else {
  noWorker.onMessage = async e => {
    e = { data: e };
    await load(e.data.path, e.data.host);
    noWorker.onMessage = d => makeFrame({ data: d });
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