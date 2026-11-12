/**
 * Fake ChantRecognizer plugin (android/.../speech/ChantRecognizerPlugin.java) as
 * exposed by the Capacitor bridge. Its native side restarts the recogniser
 * itself, so the web layer only sees partial/final/error/state/route/level events.
 */
function fakeChantRecognizer({ permission = 'granted', initial = 'prompt', available = true, startError = null } = {}) {
  const listeners = {};
  const plugin = {
    starts: [], stops: 0, permissionRequests: [], awake: [], contexts: [],
    setContext: async ({ phrases }) => { plugin.contexts.push(phrases); },
    getState: async () => ({ listening: true, service: 'com.google.android.googlequicksearchbox', language: 'hi-IN', route: '1/6', attempts: 3, errors: '7x2', beepMuted: true, biasing: true, sdk: 34 }),
    available: async () => ({ available }),
    checkPermissions: async () => ({ microphone: permission === 'granted' && initial === 'granted' ? 'granted' : initial }),
    requestPermissions: async (opts) => { plugin.permissionRequests.push(opts); return { microphone: permission }; },
    removeAllListeners: async () => { for (const k of Object.keys(listeners)) delete listeners[k]; },
    addListener: async (name, fn) => { listeners[name] = fn; return { remove() {} }; },
    start: async (opts) => {
      if (startError) throw startError;
      plugin.starts.push(opts);
      return { beepMuted: true };
    },
    stop: async () => { plugin.stops++; },
    keepAwake: async ({ on }) => { plugin.awake.push(on); },
    emit: (name, data) => listeners[name] && listeners[name](data)
  };
  return plugin;
}

function nativeGlobals(plugin, extra = {}) {
  const gum = { calls: 0 };
  return {
    gum,
    globals: {
      Capacitor: { isNativePlatform: () => true, Plugins: { ChantRecognizer: plugin } },
      navigator: { vibrate() {}, mediaDevices: { getUserMedia: async () => { gum.calls++; return { getTracks: () => [] }; } } },
      ...extra
    }
  };
}

module.exports = { fakeChantRecognizer, nativeGlobals };
