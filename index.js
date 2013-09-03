var Readable = require('stream').Readable;
var PassThrough = require('stream').PassThrough;
var mimelib = require('mimelib');
var encodeQuotedPrintable = require('encode-quoted-printable');
var streamToString = require('./lib/stream-to-string.js');
var quotedPrintableStream = require('quoted-printable-stream');
var mimePartStream = require('mime-part-stream');
var mimePartTextStream = mimePartStream.bind(mimePartStream, {type: 'text/plain; charset=UTF-8', transferEncoding: 'quoted-printable'});
var mimePartHTMLStream = mimePartStream.bind(mimePartStream, {type: 'text/html; charset=UTF-8', transferEncoding: 'quoted-printable'});

var MAIL_AGENT_HEADER = 'Node EmailStream';
var NEWLINE = '\r\n';

function EmailStream() {
  Readable.apply(this, arguments);
  this._mimeBoundary = 'NES.1.' + Date.now();
  this._inboundStreamCount = 0;
  this._inboundStreamingEnded = false;
  this._emailHeadersPushed = false;
  this._outputBuffer = '';
}

EmailStream.prototype = Object.create(Readable.prototype, { constructor: EmailStream });

EmailStream.prototype._read = function (size) {
  if (!nonEmptyString(this._to)) {
    this._emitNoToError();
  }
  else if (!nonEmptyString(this._from)) {
    this._emitNoFromError();
  }
  else if (!nonEmptyString(this._subject)) {
    this._emitNoSubjectError();
  }
  else if (!this._textStream) {
    this._emitNoTextStreamError();
  }
  else if (!this._emailHeadersPushed) {
    this._pushRawEmailHeaders();
    this._startStreamingInboundStreams();
  }
  else if (this._inboundStreamingActive() || this._outputBufferNotEmpty()) {
    this._pushOutputBuffer();
  }
  else {
    this.push(null);
  }
};

EmailStream.prototype.setTo = function (to) {
  this._to = to;
};

EmailStream.prototype.setFrom = function (from) {
  this._from = from;
};

EmailStream.prototype.setSubject = function (subject) {
  this._subject = subject;
};

EmailStream.prototype.text = function () {
  if (!this._textStream) {
    this._initTextStream();
  }

  return this._textStream;
};

EmailStream.prototype.html = function () {
  if (!this._htmlStream) {
    this._initHTMLStream();
  }

  return this._htmlStream;
};

EmailStream.prototype._emitNoToError = function () {
  this.emit('error', new Error('EmailStream requires a to email address'));
};

EmailStream.prototype._emitNoFromError = function () {
  this.emit('error', new Error('EmailStream requires a from email address'));
};

EmailStream.prototype._emitNoSubjectError = function () {
  this.emit('error', new Error('EmailStream requires a subject'));
};

EmailStream.prototype._emitNoTextStreamError = function () {
  this.emit('error', new Error('EmailStream requires a text stream'));
};

EmailStream.prototype._initTextStream = function () {
  this._textStream = PassThrough().pipe(quotedPrintableStream());
  this._inboundStreamCount++;
};

EmailStream.prototype._initHTMLStream = function () {
  this._htmlStream = quotedPrintableStream();
  this._inboundStreamCount++;
};

EmailStream.prototype._pushRawEmailHeaders = function () {
  this._emailHeadersPushed = true;
  this.push(this._generateRawEmailHeaders());
};

EmailStream.prototype._generateRawEmailHeaders = function () {
  var headers = [];

  headers.push('To: ' + this._to);
  headers.push('From: ' + this._from);
  headers.push('Subject: ' + this._subject);

  if (this._isTextHTMLEmail()) {
    headers.push('MIME-Version: 1.0');
    headers.push('Content-Type: multipart/alternative; boundary=' + this._mimeBoundary);
  }
  else {
    headers.push('Content-Type: text/plain');
    headers.push('Content-Transfer-Encoding: quoted-printable');
  }

  headers.push('X-Mailer: ' + MAIL_AGENT_HEADER);

  return headers.join(NEWLINE) + NEWLINE + NEWLINE;
};

EmailStream.prototype._pushOutputBuffer = function () {
  this.push(this._outputBuffer);
  this._clearOutputBuffer();
};

EmailStream.prototype._clearOutputBuffer = function () {
  this._outputBuffer = '';
};

EmailStream.prototype._isTextHTMLEmail = function () {
  return this._htmlStream !== undefined;
};

EmailStream.prototype._addToOutputBuffer = function (data) {
  this._outputBuffer += data.toString();
};

EmailStream.prototype._mimeMessageIntroduction = function () {
  return 'This is a MIME message.' + NEWLINE + NEWLINE;
};

EmailStream.prototype._multipartBoundarySeparator = function () {
  return '--' + this._mimeBoundary + NEWLINE;
};

EmailStream.prototype._multipartFinalBoundary = function () {
  return '--' + this._mimeBoundary + '--' + NEWLINE;
};

EmailStream.prototype._startStreamingInboundStreams = function () {
  if (this._isTextHTMLEmail()) {
    this._streamTextHTMLEmail();
  }
  else {
    this._streamPlainTextEmail();
  }
};

EmailStream.prototype._streamPlainTextEmail = function () {
  this._textStream.on('data', this._addToOutputBuffer.bind(this));
  this._textStream.on('end', this._onEndPlainTextEmailTextStream.bind(this));
};

EmailStream.prototype._onEndPlainTextEmailTextStream = function () {
  this._addToOutputBuffer(NEWLINE);
  this._decrementInboundStreamCount();
};

EmailStream.prototype._decrementInboundStreamCount = function () {
  this._inboundStreamCount--;
  this._inboundStreamingEnded = !this._inboundStreamCount;
};

EmailStream.prototype._streamTextHTMLEmail = function () {
  this._addToOutputBuffer(this._mimeMessageIntroduction() + this._multipartBoundarySeparator());
  this._addToOutputBuffer('Content-Type: text/plain; charset=UTF-8' + NEWLINE + 'Content-Transfer-Encoding: quoted-printable' + NEWLINE + NEWLINE);
  this._textStream.on('data', this._addToOutputBuffer.bind(this));
  this._textStream.on('end', this._onEndTextHTMLEmailTextStream.bind(this));
};

EmailStream.prototype._onEndTextHTMLEmailTextStream = function () {
  this._addToOutputBuffer(NEWLINE);
  this._addToOutputBuffer(this._multipartBoundarySeparator());
  this._addToOutputBuffer('Content-Type: text/html; charset=UTF-8' + NEWLINE + 'Content-Transfer-Encoding: quoted-printable' + NEWLINE + NEWLINE);
  this._decrementInboundStreamCount();
  this._streamTextHTMLEmailHTMLStream();
};

EmailStream.prototype._streamTextHTMLEmailHTMLStream = function () {
  this._htmlStream.on('data', this._addToOutputBuffer.bind(this));
  this._htmlStream.on('end', this._onEndTextHTMLEmailHTMLStream.bind(this));
};

EmailStream.prototype._onEndTextHTMLEmailHTMLStream = function () {
  this._addToOutputBuffer(NEWLINE);
  this._addToOutputBuffer(this._multipartFinalBoundary());
  this._decrementInboundStreamCount();
};

EmailStream.prototype._inboundStreamingActive = function () {
  return this._inboundStreamCount > 0 && !this._inboundStreamingEnded;
};

EmailStream.prototype._outputBufferNotEmpty = function () {
  return this._outputBuffer !== '';
};

function nonEmptyString(str) {
  return Object.prototype.toString.call(str) === '[object String]' && str !== '';
}

function newEmailStream(options) {
  var email = new EmailStream();

  options = options || {};
  email.setTo(options.to);
  email.setFrom(options.from);
  email.setSubject(options.subject);

  return email;
}

module.exports = newEmailStream;
