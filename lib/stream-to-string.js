var Writable = require('stream').Writable;

function StreamToString() {
  Writable.apply(this, arguments);
  this._chunks = [];
}

StreamToString.prototype = Object.create(Writable.prototype, { constructor: StreamToString });

StreamToString.prototype._write = function (chunk, encoding, callback) {
  this._chunks.push(chunk);
  callback();
};

StreamToString.prototype.toString = function () {
  return this._chunks.reduce(this._reduceToString, '');
};

StreamToString.prototype._reduceToString = function (memo, chunk) {
  return memo + chunk.toString();
};

function streamToString() {
  return new StreamToString();
}

module.exports = streamToString;
