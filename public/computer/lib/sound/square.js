export default class Square {
  // Generic for all instruments.
  playing = true;
  #duration = 0;
  #progress = 0;

  // Specific to Square.
  #length = 1024; // Calculated from the frequency.
  #up = false;
  #step = 0;

  constructor(frequency, duration) {
    // TODO: Convert the frequency / note to the gap here?
    /*
      Check if it's a string or a number and match notes to string
      or just use frequency if it's a number.
      */

    // Tuning adjustment.
    // Measured on MacBook Air with iOS App. - Aug 16, 5:56pm.
    const tuning = 50;
    frequency += tuning;

    // Frequency in samples, divided by 2 yields the period length.
    this.#length = sampleRate / frequency / 2;
    this.#duration = duration;
  }

  get next() {
    // Generic for all instruments.
    this.#progress += 1;
    if (this.#progress >= this.#duration) {
      this.playing = false;
      return 0;
    }

    // TODO: Add attack.

    // Decay
    const envelope = 1 - this.#progress / this.#duration;
    // const envelope = 1;

    // Specific to Square.
    if (this.#step < this.#length) {
      this.#step += 1;
    } else {
      this.#up = !this.#up;
      this.#step = 0;
    }

    if (this.#up) {
      return envelope;
    } else {
      return -envelope;
    }
  }
}
