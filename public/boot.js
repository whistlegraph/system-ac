import { boot } from "./computer/bios.js";

const host = "disks.aesthetic.computer";
// const host = "127.0.0.1:8081";
const bpm = 120;
const debug = false;

// TODO: Make my first generative disk / piece and mint it.

// For now there is no interactive boot menu, so we load a disk directly.

if (window.location.hash === "#pull") {
  // boot("pull", bpm, host, undefined, debug);
  boot("pull", bpm, host, { width: 32, height: 33 }, debug);
} else {
  boot("stage", bpm, host);
}

// boot("metronome-test", bpm, host);
// boot("doodle", bpm, host);
// boot("starfield", host);
// load("blank", host);
// load("worker-disk", host);
