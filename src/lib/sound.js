/**
 * @typedef {Object} EngineSoundOptions
 * @property {number} baseFrequency
 * @property {number} maxFrequency
 * @property {number} volume
 */

class EngineSound {
  constructor() {
    this.audioContext = null
    this.oscillator = null
    this.masterGain = null
    this.lfo = null
    this.modGain = null
    this.isInitialized = false
  }

  async initialize() {
    if (this.isInitialized) return

    this.audioContext = new AudioContext()
    this.oscillator = this.audioContext.createOscillator()
    this.masterGain = this.audioContext.createGain()

    // Set up main oscillator
    this.oscillator.frequency.setValueAtTime(200, 0)
    this.oscillator.connect(this.masterGain)
    this.masterGain.gain.value = 0.2
    this.masterGain.connect(this.audioContext.destination)

    // Set up LFO for modulation
    this.lfo = this.audioContext.createOscillator()
    this.modGain = this.audioContext.createGain()
    
    this.lfo.frequency.setValueAtTime(30, 0)
    this.modGain.gain.value = 60
    
    this.lfo.connect(this.modGain)
    this.modGain.connect(this.oscillator.frequency)

    // Resume the audio context (required after user interaction)
    await this.audioContext.resume()
    this.isInitialized = true
  }

  async start() {
    if (!this.isInitialized) {
      await this.initialize()
    }
    this.oscillator.start()
    this.lfo.start()
  }

  stop() {
    if (this.oscillator) {
      this.oscillator.stop()
    }
    if (this.lfo) {
      this.lfo.stop()
    }
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
      this.oscillator = null
      this.masterGain = null
      this.lfo = null
      this.modGain = null
      this.isInitialized = false
    }
  }

  /**
   * @param {number} speed
   * @param {number} maxSpeed
   */
  update(speed, maxSpeed) {
    if (!this.isInitialized || !this.oscillator || !this.masterGain) return

    const percent = Math.abs(speed / maxSpeed)
    
    // Set volume based on speed percentage
    this.masterGain.gain.value = percent * 0.2
    
    // Set pitch based on speed percentage (matching reference formula)
    this.oscillator.frequency.setValueAtTime(
      percent * 200 + 100,
      0
    )
  }
}

/**
 * @param {EngineSoundOptions} [options]
 * @returns {EngineSound}
 */
export function createEngineSound() {
  return new EngineSound()
} 