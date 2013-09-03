var SandwichStream = require('sandwich-stream').SandwichStream;
var mimeHeaders = require('mime-headers');
var mimePartStream = require('mime-part-stream');
var quotedPrintableStream = require('quoted-printable-stream');
var MAIL_USER_AGENT = 'Node EmailStream';
var NEWLINE = '\r\n';
var MIME_MESSAGE = 'This is a MIME message.' + NEWLINE + NEWLINE;

function EmailStream(options) {
  options = options || {};

  this._setTo(options.to);
  this._setFrom(options.from);
  this._setSubject(options.subject);
  this._setBody({ text: options.text, html: options.html });
  this._setBoundary();

  options.head = this._generateStreamHead();
  options.separator = this._generateStreamSeparator();
  options.tail = this._generateStreamTail();

  SandwichStream.call(this, options);
  this._addBodyStreams();
}

EmailStream.prototype = Object.create(SandwichStream.prototype, {
  constructor: EmailStream
});

EmailStream.prototype._setTo = function (to) {
  if (!nonEmptyString(to)) {
    throw new Error('EmailStream no to address set');
  }
  else {
    this._to = to;
  }
};

EmailStream.prototype._setFrom = function (from) {
  if (!nonEmptyString(from)) {
    throw new Error('EmailStream no from address set');
  }
  else {
    this._from = from;
  }
};

EmailStream.prototype._setSubject = function (subject) {
  if (!nonEmptyString(subject)) {
    throw new Error('EmailStream no subject set');
  }
  else {
    this._subject = subject;
  }
};

EmailStream.prototype._setBody = function (body) {
  if (body.text || body.html) {
    if (body.text) {
      this._text = body.text;
    }

    if (body.html) {
      this._html = body.html;
    }
  }
  else {
    throw new Error('EmailStream no email body stream set');
  }
};

EmailStream.prototype._setBoundary = function () {
  this._boundary = 'NES.1.' + Date.now();
};

EmailStream.prototype._generateStreamHead = function () {
  var headers = mimeHeaders();
  var mimeMessage = '';
  var separator = '';

  headers.push('To', this._to);
  headers.push('From', this._from);
  headers.push('Subject', this._subject);

  if (this._hasBothBodyStreams()) {
    headers.push('MIME-Version', '1.0');
    headers.push('Content-Type', 'multipart/alternative; boundary=' + this._boundary);
    separator += '--' + this._boundary + NEWLINE;
    mimeMessage += MIME_MESSAGE;
  }
  else if (this._hasTextBodyStream()) {
    headers.push('Content-Type', 'text/plain');
    headers.push('Content-Transfer-Encoding', 'quoted-printable');
  }

  headers.push('X-Mailer', MAIL_USER_AGENT);

  return headers.toString() + mimeMessage + separator;
};

EmailStream.prototype._generateStreamTail = function () {
  if (this._hasBothBodyStreams()) {
    return '--' + this._boundary + '--' + NEWLINE;
  }

  return NEWLINE;
};

EmailStream.prototype._generateStreamSeparator = function () {
  if (this._hasBothBodyStreams()) {
    return '--' + this._boundary + NEWLINE;
  }
};

EmailStream.prototype._addBodyStreams = function() {
  if (this._hasBothBodyStreams()) {
    this._addTextAndHTMLBodyStreams();
  }
  else if (this._hasTextBodyStream()) {
    this._addTextBodyStream();
  }
};

EmailStream.prototype._hasBothBodyStreams = function () {
  return this._text && this._html;
};

EmailStream.prototype._hasTextBodyStream = function () {
  return this._text;
};

EmailStream.prototype._addTextAndHTMLBodyStreams = function () {
  this.add(this._text.pipe(mimePartStream({
    type: 'text/plain; charset=UTF-8',
    transferEncoding: 'quoted-printable'
  })));
  this.add(this._html.pipe(mimePartStream({
    type: 'text/html; charset=UTF-8',
    transferEncoding: 'quoted-printable'
  })));
};

EmailStream.prototype._addTextBodyStream = function () {
  this.add(this._text.pipe(quotedPrintableStream()));
};

function emailStream(options) {
  var stream = new EmailStream(options);
  return stream;
}

function nonEmptyString(str) {
  return Object.prototype.toString.call(str) === '[object String]' && str !== '';
}


module.exports = emailStream;
