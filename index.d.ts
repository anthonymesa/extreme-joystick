// index.d.ts (or joystick.d.ts, see notes below)

/**
 * Options for configuring a Joystick instance.
 */
export interface JoystickOptions {
  /**
   * If true (default), Joystick will attach a 'data' listener on the HID device
   * and emit events automatically.
   *
   * If false, you are expected to call `poll()` manually (e.g. from a Raylib loop).
   */
  useEvents?: boolean;

  /**
   * Enable or disable exponential smoothing (EMA) of axis values.
   * Default: false
   */
  smoothingEnabled?: boolean;

  /**
   * Smoothing factor in (0, 1].
   * Higher = more responsive, lower = smoother but more latency.
   * Default: 0.25
   */
  smoothingAlpha?: number;
}

/**
 * Parsed joystick controls.
 * All fields you get back from `poll()`, `getState()` or the 'data' event.
 */
export interface JoystickControls {
  /** Raw roll axis (0–1023) */
  roll: number;

  /** Raw pitch axis (0–1023) */
  pitch: number;

  /** Raw yaw axis (0–254) */
  yaw: number;

  /** POV hat / view switch (device-specific range, usually 0–7 plus neutral) */
  view: number;

  /** Throttle value (0–255 after transformation) */
  throttle: number;

  /** Array of button states (0 or 1) */
  buttons: number[];

  /** Raw pre-smoothing roll value (0–1023) */
  rawRoll: number;

  /** Raw pre-smoothing pitch value (0–1023) */
  rawPitch: number;

  /** Raw pre-smoothing yaw value (0–254) */
  rawYaw: number;

  /** Raw pre-smoothing throttle value (0–255) */
  rawThrottle: number;

  /**
   * Normalized roll in [0, 1].
   *
   * After smoothing if smoothing is enabled.
   */
  normalizedRoll: number;

  /**
   * Normalized pitch in [0, 1].
   *
   * After smoothing if smoothing is enabled.
   */
  normalizedPitch: number;

  /**
   * Normalized yaw in [0, 1].
   *
   * After smoothing if smoothing is enabled.
   */
  normalizedYaw: number;
}

/**
 * Joystick class (CommonJS export in JS: `module.exports = Joystick`).
 */
declare class Joystick {
  /**
   * Create a new Joystick instance.
   *
   * @param vendorID  USB vendor ID. Default: 1133
   * @param productID USB product ID. Default: 49685
   * @param options   Optional configuration (events / smoothing)
   */
  constructor(
    vendorID?: number,
    productID?: number,
    options?: JoystickOptions
  );

  /**
   * Enable or disable exponential smoothing (EMA) at runtime.
   */
  setSmoothingEnabled(enabled: boolean): void;

  /**
   * Set EMA alpha in (0, 1]. Higher = more responsive, lower = smoother.
   *
   * Throws if alpha is not in (0, 1].
   */
  setSmoothingAlpha(alpha: number): void;

  /**
   * Convenience for setting smoothing on/off and optionally alpha.
   */
  setSmoothing(enabled: boolean, alpha?: number): void;

  /**
   * Poll the device synchronously and return the current joystick state.
   *
   * - If `readTimeout()` is available on the underlying HID device, this uses
   *   that with the given timeout and may return the last known state if no
   *   new report arrives in time.
   * - Otherwise it uses a blocking `readSync()` call, and will typically block
   *   only briefly, since HID reports are usually frequent.
   *
   * @param timeoutMs Timeout in milliseconds for non-blocking reads (if supported).
   * @returns The latest (possibly smoothed) controls object, or `null` if the
   *          device could not be opened.
   */
  poll(timeoutMs?: number): JoystickControls | null;

  /**
   * Get the last known state without performing any HID I/O.
   *
   * @returns The last parsed controls object, or `null` if no data has been
   *          received yet.
   */
  getState(): JoystickControls | null;

  /**
   * Subscribe to joystick events.
   *
   * NOTE: currently only 'data' is emitted by the library implementation,
   * but these overloads leave room for future granular events.
   */

  /** Fired whenever a new report is parsed. */
  on(event: 'data', callback: (controls: JoystickControls) => void): void;

  /**
   * Potential future event: a specific button index transitioned to pressed.
   * Included for completeness; currently not emitted by the JS implementation.
   */
  on(
    event: 'buttonPressed',
    callback: (buttonIndex: number, controls: JoystickControls) => void
  ): void;

  /**
   * Potential future event: any axis moved.
   * Included for completeness; currently not emitted by the JS implementation.
   */
  on(event: 'axisMoved', callback: (controls: JoystickControls) => void): void;

  /** Fallback for untyped / custom events. */
  on(event: string, callback: (...args: any[]) => void): void;

  /**
   * Close the underlying HID device handle.
   * After calling this, `poll()` will return `null` or the last known state.
   */
  close(): void;
}

/**
 * The module's export is the Joystick class (CommonJS style).
 *
 * JS:
 *   const Joystick = require('joystick-extreme');
 *
 * TS:
 *   import Joystick = require('joystick-extreme');
 *   // or with esModuleInterop:
 *   import Joystick from 'joystick-extreme';
 */
export = Joystick;

