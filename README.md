# extreme-joystick

Node.js library for reading input from a **Logitech Extreme 3D Pro** joystick via HID.

## Install

```bash
npm install extreme-joystick
```

On Linux, the postinstall script will offer to set up a udev rule so the device can be accessed without `sudo`. If you skip it, you can install the rule later:

```bash
sudo ./node_modules/extreme-joystick/install-udev.sh
```

## Quick Start

### Event-driven (default)

```js
const Joystick = require('extreme-joystick');

const joy = new Joystick();

joy.on('data', (controls) => {
  console.log(
    `roll=${controls.roll}  pitch=${controls.pitch}  yaw=${controls.yaw}  ` +
    `throttle=${controls.throttle}  view=${controls.view}  ` +
    `buttons=[${controls.buttons.join(',')}]`
  );
});

// Close on Ctrl+C
process.on('SIGINT', () => {
  joy.close();
  process.exit();
});
```

### Polling (for game loops)

Pass `useEvents: false` and call `poll()` yourself:

```js
const Joystick = require('extreme-joystick');

const joy = new Joystick(undefined, undefined, { useEvents: false });

setInterval(() => {
  const state = joy.poll(10); // 10 ms timeout
  if (state) {
    console.log(
      `roll=${state.normalizedRoll.toFixed(2)}  ` +
      `pitch=${state.normalizedPitch.toFixed(2)}  ` +
      `yaw=${state.normalizedYaw.toFixed(2)}  ` +
      `throttle=${state.throttle}`
    );
  }
}, 16); // ~60 Hz
```

## API

### `new Joystick([vendorID], [productID], [options])`

| Parameter   | Default | Description |
|-------------|---------|-------------|
| `vendorID`  | `1133`  | USB vendor ID (0x046D) |
| `productID` | `49685` | USB product ID (0xC215) |
| `options`   | `{}`    | See below |

#### Options

| Key                | Type    | Default | Description |
|--------------------|---------|---------|-------------|
| `useEvents`        | boolean | `true`  | Attach a HID `data` listener and emit events automatically. Set to `false` for manual `poll()` mode. |
| `smoothingEnabled` | boolean | `false` | Apply exponential moving average (EMA) to axis values. |
| `smoothingAlpha`   | number  | `0.25`  | EMA factor in (0, 1]. Higher = more responsive, lower = smoother. |

### `joy.on('data', callback)`

Subscribe to parsed joystick reports. `callback` receives a `JoystickControls` object.

### `joy.poll([timeoutMs])`

Read a HID report synchronously. Returns a `JoystickControls` object, the last known state if no new report arrived within the timeout, or `null` if the device isn't open.

### `joy.getState()`

Return the last parsed state without any HID I/O. Returns `null` if no data has been received yet.

### `joy.setSmoothingEnabled(enabled)`

Toggle EMA smoothing at runtime.

### `joy.setSmoothingAlpha(alpha)`

Set the EMA factor. Throws if `alpha` is not in (0, 1].

### `joy.setSmoothing(enabled, [alpha])`

Convenience for setting both at once.

### `joy.close()`

Close the underlying HID device.

## JoystickControls

| Field             | Range     | Description |
|-------------------|-----------|-------------|
| `roll`            | 0–1023    | Roll axis (smoothed if enabled) |
| `pitch`           | 0–1023    | Pitch axis (smoothed if enabled) |
| `yaw`             | 0–254     | Yaw / twist axis (smoothed if enabled) |
| `view`            | 0–15      | POV hat switch |
| `throttle`        | 0–255     | Throttle slider |
| `buttons`         | [0\|1]×12 | 12 button states (1 = pressed) |
| `rawRoll`         | 0–1023    | Pre-smoothing roll |
| `rawPitch`        | 0–1023    | Pre-smoothing pitch |
| `rawYaw`          | 0–254     | Pre-smoothing yaw |
| `rawThrottle`     | 0–255     | Pre-smoothing throttle |
| `normalizedRoll`  | 0–1       | Normalized roll (post-smoothing) |
| `normalizedPitch` | 0–1       | Normalized pitch (post-smoothing) |
| `normalizedYaw`   | 0–1       | Normalized yaw (post-smoothing) |

## License

MIT
