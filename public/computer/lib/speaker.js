/* global currentFrame, sampleRate, currentTime */

// import * as sine from "./sound/sine.js";
import * as volume from "./sound/volume.js";
import Square from "./sound/square.js";

// Helpful Info:

// For basic audio waveform algorithms see: https://github.com/Flarp/better-oscillator/blob/master/worklet.js
// And read about: https://en.wikipedia.org/wiki/Oscillator_sync#Hard_Sync

// Retrieve the currentFrame or currentTime (in seconds);
// console.log("Current frame:", currentFrame, currentTime);
// See also: https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletGlobalScope

// Also, many parameters can be used and configured:
// https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletNode/parameters
// TODO: Use parameters to change properties of square over time and eventually add more nodes.

class SoundProcessor extends AudioWorkletProcessor {
  #ticks;
  #lastTime;

  #bpm;
  #bpmInSec;

  #queue = [];

  constructor(options) {
    super();
    this.#lastTime = currentTime;

    this.#bpm = options.processorOptions.bpm;
    this.#bpmInSec = 60 / this.#bpm;
    this.#ticks = this.#bpmInSec;

    volume.amount.val = 0.25; // Set global volume.

    // Change BPM, or queue up an instrument note.
    this.port.onmessage = (e) => {
      const msg = e.data;

      // New BPM
      if (msg.type === "new-bpm") {
        this.#bpm = msg.data;
        this.#bpmInSec = 60 / this.#bpm;
        console.log("🎼 New BPM:", this.#bpm);
      }

      // Square
      if (msg.type === "square") {
        const durationInFrames = Math.round(
          sampleRate * (this.#bpmInSec * msg.data.duration)
        );

        this.#queue.push(new Square(msg.data.note, durationInFrames));

        console.log("🎼 Square:", msg.data.note, msg.data.duration);
      }

      // Sample

      // Triangle

      // Sine

      // Saw
    };
  }

  process(inputs, outputs) {
    // 1️⃣ Metronome
    this.#ticks += currentTime - this.#lastTime;
    this.#lastTime = currentTime;

    // const timeTillNextBeat = this.#ticks / this.#bpmInSec;

    if (this.#ticks >= this.#bpmInSec) {
      this.#ticks = 0;
      this.port.postMessage(currentTime);
    }

    // 2️⃣ Sound generation
    // const input = inputs[0];
    const output = outputs[0];

    // Loop through each channel.
    for (let channel = 0; channel < output.length; channel += 1) {
      // Loop through every audio frame in the channel. (There will be many frames.)
      for (let frame = 0; frame < output[channel].length; frame += 1) {
        // Remove any finished instruments from the queue.
        this.#queue = this.#queue.filter((instrument) => {
          return instrument.playing;
        });

        // Loop through every instrument in the queue and add it to the output.
        for (const instrument of this.#queue) {
          // For now, all sounds are maxed out and mixing happens by dividing by the total length.
          output[channel][frame] += instrument.next / this.#queue.length;
        }

        // Mix all sound through global volume.
        output[channel][frame] = volume.apply(output[channel][frame]);
      }
    }

    return true;
  }
}

registerProcessor("sound-processor", SoundProcessor);
