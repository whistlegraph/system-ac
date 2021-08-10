/* global currentFrame, currentTime */

// 📚 Note:
/*
How many voices should this instrument have?
What if it mimicked the human voice and we could do
different things with it, but there was only one or two "voices" known to the system? 
*/

// For basic audio waveform algorithms see: https://github.com/Flarp/better-oscillator/blob/master/worklet.js
// And read about: https://en.wikipedia.org/wiki/Oscillator_sync#Hard_Sync
import * as sine from "./sound/sine.js";
import * as square from "./sound/square.js";
import * as volume from "./sound/volume.js";

// 

/*
const gainParam = whiteNoiseNode.parameters.get('customGain')
gainParam.setValueAtTime(0, audioContext.currentTime)
gainParam.linearRampToValueAtTime(0.5, audioContext.currentTime + 0.5)
*/

class SoundProcessor extends AudioWorkletProcessor {
  // When constructor() undefined, the default constructor will be
  // implicitly used.

  // TODO: Use parameters to change properties of square over time and eventually add more nodes.
  // Can also use worker postMessage for this!
 
  /*
  static get parameterDescriptors () {
    return [{
      name: 'volume',
      defaultValue: 1,
      minValue: 0,
      maxValue: 1,
      automationRate: 'a-rate'
    }]
  }
  */
  
  // Also, many parameters can be used and configured:
  // https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletNode/parameters

  // Retrieve the currentFrame or currentTime (in seconds);
  // console.log("Current frame:", currentFrame, currentTime);
  
  process(inputs, outputs, parameters) {
   
    // const input = inputs[0];
    const output = outputs[0];
    
    // volume.amount.val = 
    // TODO: See code here:
    // https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletNode/parameters
    // parameters['volume']

    // Loop through each channel.
    for (let channel = 0; channel < output.length; channel += 1) {
     
      // Loop through every audio frame in the channel. (There will be many frames.)
      for (let frame = 0; frame < output[channel].length; frame += 1) {
      
        // We have
        
          // Instruments:
          // 1. Each instrument can only play one sound at a time.
          // 2. Each instrument has a "state" and a "next" function.
          // 3. Each instrument has an API to change the state which affects the next function.
          // 4. All instruments should be mixed evenly here via a mixer function.
          // 5. Mixer applies an overall volume in addition to volume controls for each instrument.
        
        
          // Instrument Types
          // beep
              // -- For melody.
          /* API */
        
        
          // tick
              // -- For percussion.
          /* API */
        
        
          // Metronome:
          // Set BPM
        
        
        output[channel][frame] = volume.apply(square.gen());
        
        
      }
      
      
    }

    return true;
  }
}

registerProcessor("sound-processor", SoundProcessor);