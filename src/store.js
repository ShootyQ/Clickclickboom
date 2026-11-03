(function (root) {
  'use strict';
  // A UI adapter only. Ownership is decided and stored by native Play Billing,
  // never by the game's localStorage or a JavaScript purchase-success message.
  function createStore(bridge, changed) {
    let state = {native: false, adsRemoved: false, canBuy: false, busy: false, price: '',
      message: 'Purchases are available in the Android app through Google Play.', privacyRequired: false};
    return {
      get state() { return {...state}; },
      applyState(next) {
        if (!next || typeof next !== 'object') return;
        state = {native: next.native === true, adsRemoved: next.adsRemoved === true,
          canBuy: next.canBuy === true, busy: next.busy === true,
          price: typeof next.price === 'string' ? next.price : '',
          message: typeof next.message === 'string' ? next.message : '',
          privacyRequired: next.privacyRequired === true};
        changed({...state});
      },
      request(action) {
        if (!['ready', 'buy', 'restore', 'privacy', 'policy'].includes(action)) return;
        if (!bridge || typeof bridge.postMessage !== 'function') {
          state.message = 'Purchases are available in the Android app through Google Play.';
          changed({...state});
          return;
        }
        if (action === 'buy' && (!state.canBuy || state.busy || state.adsRemoved || !state.price)) return;
        try { bridge.postMessage(action); }
        catch (_) { state.message = 'Google Play is unavailable. Please reopen the app and try again.'; changed({...state}); }
      }
    };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = createStore;
  else root.createSplatStore = createStore;
})(globalThis);
