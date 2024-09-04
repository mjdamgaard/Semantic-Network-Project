
// ParallelCallbackHandler is basically like a special case JS Promise class.
// Usage: Make an callbackHandler instance, then push some callbacks, together
// with a key, that all ultimately ends in a call to either
// callbackHandler.resolve(key) or callbackHandler.resolve(reject). Then
// call callbackHandler.executeThen(finalCallback) to fire off the callbacks.
// When all callbacks are resolved, a call to finalCallback("success") is made.
// But if one is rejected a call to finalCallback("failure", key) is made
// instead, where key is the key of the failed callback.
export class ParallelCallbackHandler {
  constructor() {
    this.callbackObj = [];
    this.isReadyObj = [];
    this.finalCallback = null;
  }

  resolve(key) {
    this.isReadyObj[key] = true;
    let isReady = Object.keys(this.callbackObj).reduce(
      (acc, key) => acc && this.isReadyObj[key],
      true
    );
    if (isReady) {
      this.finalCallback("success");
    }
  }

  reject(key) {
    this.finalCallback("failure", key);
  }

  push(key, callback) {
    this.callbackObj[key] = callback;
  }

  executeThen(finalCallback) {
    this.finalCallback = finalCallback ?? void(0);
    Object.values(this.callbackObj).forEach(callback => {
      callback();
    });

  }

}

