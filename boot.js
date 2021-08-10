import { boot } from "./computer/bios.js";
const host = "disk.whistlegraph.com"; 

// For now there is no interactive boot menu, so we load a disk directly.
boot("metronome-test", host);
// boot("doodle", host);
// boot("starfield", host);
// load("blank", host);
// load("worker-disk", host);

// I wonder if game assets / drawings and other media can be distributed
// using load codes...

// Thoughts

/*

Hardware functions API - 

Mx: "mouse-x",
My: "mouse-y"

Px: "pen.x"
Py: "pen.y"
Pc: "penChanged",
Pp: "penPinch" (Or mouse scroll)

x
y
moved
drag
zoom
*/