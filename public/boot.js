// TODO: Write note taking program?
// TODO: Refactor current code.
// TODO: Ink types? ... can they be procedural using a buffer?
// TODO: Fix Firefox: https://bugzilla.mozilla.org/show_bug.cgi?id=1247687

import { boot } from "./computer/bios.js";

// const host = "disks.aesthetic.computer";
const host = `${window.location.hostname}:8081`;
const bpm = 120;
const debug = true;

// TODO: Make my first generative disk / piece and mint it.

if (window.location.hash === "#pull") {
  // boot("pull", bpm, host, undefined, debug);
  boot("pull", bpm, host, { width: 64, height: 65 }, debug);
} else if (window.location.hash === "#whistlegraph") {
  boot("whistlegraph", bpm, host, undefined, debug);
} else {
  boot("stage", bpm, host);
}

// boot("metronome-test", bpm, host);
// boot("doodle", bpm, host);
// boot("starfield", host);
// load("blank", host);
// load("worker-disk", host);
