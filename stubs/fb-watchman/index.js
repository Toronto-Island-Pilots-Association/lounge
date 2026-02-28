'use strict';

const { EventEmitter } = require('events');

const STUB_MSG = 'Watchman disabled; Jest will use Node crawler/watcher.';

/**
 * Stub Client so Jest's jest-haste-map never actually uses Watchman.
 * - capabilityCheck() and command() call back with an error so the crawler
 *   retries with the Node crawler.
 * - Watch mode uses Node watcher when Watchman isn't available; if the
 *   binary is present but this stub is used, the first command fails and
 *   the watcher emits error (same as when Watchman isn't running).
 */
function Client() {
  EventEmitter.call(this);
}
Object.setPrototypeOf(Client.prototype, EventEmitter.prototype);

Client.prototype.capabilityCheck = function (caps, cb) {
  setImmediate(() => cb(new Error(STUB_MSG)));
};

Client.prototype.command = function (args, cb) {
  setImmediate(() => cb(new Error(STUB_MSG)));
};

Client.prototype.connect = function () {
  setImmediate(() => this.emit('error', new Error(STUB_MSG)));
};

Client.prototype.end = function () {};

module.exports = { Client };
