// joystick.js
const hid = require('node-hid');

class Joystick {
  /**
   * @param {number} [vendorID=1133]
   * @param {number} [productID=49685]
   * @param {Object} [options]
   *   useEvents: attach 'data' listener and emit events (default true)
   *   smoothingEnabled: apply EMA to axis values (default false)
   *   smoothingAlpha: EMA factor in (0, 1]; higher = more responsive (default 0.25)
   */
  constructor(vendorID, productID, options = {}) {
    this.vendorID = vendorID || 1133;
    this.productID = productID || 49685;

    const {
      useEvents = true,
      smoothingEnabled = false,
      smoothingAlpha = 0.25,
    } = options;

    // Smoothing config + state
    this._smoothingEnabled = !!smoothingEnabled;
    this._smoothingAlpha = smoothingAlpha;
    this._smoothingState = {}; // per-field EMA (roll, pitch, yaw, etc.)

    // Last parsed state (for getState / poll fallback)
    this._lastControls = null;

    try {
      this.device = new hid.HID(this.vendorID, this.productID);
      console.log(
        `Joystick with VID: ${this.vendorID} and PID: ${this.productID} opened successfully!`
      );
    } catch (err) {
      console.error(`Failed to open joystick device: ${err}`);
      this.device = null;
    }

    this.events = {
      data: [],
      buttonPressed: [],
      axisMoved: [],
    };

    // Event-driven mode
    if (this.device && useEvents) {
      this.device.on('data', (buf) => this._processData(buf, { emit: true }));
      this.device.on('error', (err) => {
        console.error('Joystick HID error:', err);
      });
    }
  }

  // ---------- Smoothing controls ----------

  /**
   * Enable/disable smoothing.
   */
  setSmoothingEnabled(enabled) {
    this._smoothingEnabled = !!enabled;
    if (!enabled) {
      this._smoothingState = {};
    }
  }

  /**
   * Set EMA alpha in (0, 1]. Higher = more responsive, lower = smoother.
   */
  setSmoothingAlpha(alpha) {
    if (typeof alpha !== 'number' || alpha <= 0 || alpha > 1) {
      throw new Error('smoothingAlpha must be in (0, 1].');
    }
    this._smoothingAlpha = alpha;
  }

  /**
   * Convenience: set both enabled + alpha at once.
   */
  setSmoothing(enabled, alpha) {
    this.setSmoothingEnabled(enabled);
    if (alpha !== undefined) {
      this.setSmoothingAlpha(alpha);
    }
  }

  // ---------- Helpers ----------

  // Normalize joystick values (e.g., roll and pitch from 0-1023)
  _normalize(value, min, max) {
    return (value - min) / (max - min);
  }

  /**
   * Apply EMA to selected numeric fields of the controls object.
   * Mutates and returns `controls`.
   */
  _applySmoothing(controls) {
    if (!this._smoothingEnabled) return controls;

    const alpha = this._smoothingAlpha;
    const state = this._smoothingState;

    // Fields we want to smooth (raw and normalized)
    const fields = [
      'roll',
      'pitch',
      'yaw',
      'throttle',
      'normalizedRoll',
      'normalizedPitch',
      'normalizedYaw',
    ];

    for (const key of fields) {
      const v = controls[key];
      if (typeof v !== 'number') continue;

      const prev = state[key];
      const smoothed = prev == null ? v : alpha * v + (1 - alpha) * prev;

      state[key] = smoothed;
      controls[key] = smoothed;
    }

    return controls;
  }

  /**
   * Core decode function. Optionally emits events.
   * Returns the parsed controls object.
   */
  _processData(buf, { emit = true } = {}) {
    const ch = buf
      .toString('hex')
      .match(/.{1,2}/g)
      .map((c) => parseInt(c, 16));

    // Raw joystick data
    const controls = {
      roll: ((ch[1] & 0x03) << 8) + ch[0],
      pitch: ((ch[2] & 0x0f) << 6) + ((ch[1] & 0xfc) >> 2),
      yaw: ch[3],
      view: (ch[2] & 0xf0) >> 4,
      throttle: -ch[5] + 255,
      buttons: [
        (ch[4] & 0x01) >> 0,
        (ch[4] & 0x02) >> 1,
        (ch[4] & 0x04) >> 2,
        (ch[4] & 0x08) >> 3,
        (ch[4] & 0x10) >> 4,
        (ch[4] & 0x20) >> 5,
        (ch[4] & 0x40) >> 6,
        (ch[4] & 0x80) >> 7,
        (ch[6] & 0x01) >> 0,
        (ch[6] & 0x02) >> 1,
        (ch[6] & 0x04) >> 2,
        (ch[6] & 0x08) >> 3,
      ],
    };

    // Preserve raw copies in case you ever want to use those
    controls.rawRoll = controls.roll;
    controls.rawPitch = controls.pitch;
    controls.rawYaw = controls.yaw;
    controls.rawThrottle = controls.throttle;

    // Normalize roll and pitch (0-1023 to 0-1)
    controls.normalizedRoll = this._normalize(controls.roll, 0, 1023);
    controls.normalizedPitch = this._normalize(controls.pitch, 0, 1023);

    // Normalize yaw (0-254 to 0-1)
    controls.normalizedYaw = this._normalize(controls.yaw, 0, 254);

    // Apply exponential smoothing to the axis values
    this._applySmoothing(controls);

    // Cache last state
    this._lastControls = controls;

    // Emit normalized (smoothed) data
    if (emit) {
      this._emit('data', controls);
    }

    return controls;
  }

  _emit(event, data) {
    if (this.events[event]) {
      this.events[event].forEach((callback) => callback(data));
    }
  }

  /**
   * Poll the device synchronously and return the current joystick state.
   *
   * @param {number} [timeoutMs=0]
   *        If node-hid provides readTimeout, this is used.
   *        Otherwise readSync() is used, which may block until a report arrives.
   *
   * @returns {object|null} smoothed controls object, or last known state, or null.
   */
  poll(timeoutMs = 0) {
    if (!this.device) {
      return null;
    }

    let raw;

    try {
      if (typeof this.device.readTimeout === 'function') {
        raw = this.device.readTimeout(timeoutMs);
        if (!raw || !raw.length) {
          // No new data within timeout; return last known state.
          return this._lastControls;
        }
      } else {
        // Blocking read
        raw = this.device.readSync();
        if (!raw || !raw.length) {
          return this._lastControls;
        }
      }
    } catch (err) {
      console.error('Joystick poll read error:', err.message || err);
      return this._lastControls;
    }

    const buf = Buffer.from(raw);

    // Process without emitting events (pull mode)
    return this._processData(buf, { emit: false });
  }

  /**
   * Get the last known state without doing any HID I/O.
   */
  getState() {
    return this._lastControls;
  }

  on(event, callback) {
    if (!this.events[event]) {
      throw new Error(`Event "${event}" not supported.`);
    }
    this.events[event].push(callback);
  }

  close() {
    if (this.device) {
      this.device.close();
      this.device = null;
    }
  }
}

module.exports = Joystick;

