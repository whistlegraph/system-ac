const notes = {
  // C-Major scale
  c4: 261.63,
  d4: 293.66,
  e4: 329.63,
  f4: 349.23,
  g4: 392.0,
  a4: 440.0,
  b4: 493.88,
  c5: 523.25,
};

// Check to see if the note exists or default to the input.
export function noteOrFreq(tone) {
  return notes[tone] || tone;
}
