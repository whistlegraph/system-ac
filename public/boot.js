// TODO: Write note taking program?

import { boot } from "./computer/bios.js";

const host = "disks.aesthetic.computer";
// const host = `${window.location.hostname}:8081`;
const bpm = 120;
const debug = true;

// TODO: Make my first generative disk / piece and mint it.

if (window.location.hash === "#pull") {
  // boot("pull", bpm, host, undefined, debug);
  boot("pull", bpm, host, { width: 64, height: 65 }, debug);
} else {
  boot("stage", bpm, host);
}

// boot("metronome-test", bpm, host);
// boot("doodle", bpm, host);
// boot("starfield", host);
// load("blank", host);
// load("worker-disk", host);
