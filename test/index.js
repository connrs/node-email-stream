/*jslint stupid: true */
var test = require('tape');
var emailStream = require('..');
var PassThrough = require('stream').PassThrough;
var fs = require('fs');
var path = require('path');
var email;
var output;
var mock = (function () {
  var oldDateNow = Date.now;

  function overrideDateNow(f) {
    Date.now = f;
  }

  function restoreDateNow() {
    Date.now = oldDateNow;
  }

  return {
    overrideDateNow: overrideDateNow,
    restoreDateNow: restoreDateNow
  };
}());

function readRawEmail(filename) {
  return fs.readFileSync(path.join(__dirname, 'raw-emails', filename)).toString();
}

function streamed(stream, func) {
  var output = [];

  stream.on('data', output.push.bind(output));
  stream.on('end', function () {
    func(Buffer.concat(output).toString());
  });
}

test('Emits error when no to address', function (t) {
  t.plan(1);
  try {
    email = emailStream();
    t.fail();
  }
  catch (e) {
    t.equal(e.message, 'EmailStream no to address set');
  }
});

test('Error when no from address', function (t) {
  t.plan(1);
  try {
    email = emailStream({
      to: 'test@example.com'
    });
    t.fail();
  }
  catch (e) {
    t.equal(e.message, 'EmailStream no from address set');
  }
});

test('Error when no subject', function (t) {
  t.plan(1);
  try {
    email = emailStream({
      to: 'test@example.com',
      from: 'test@example.org'
    });
    t.fail();
  }
  catch (e) {
    t.equal(e.message, 'EmailStream no subject set');
  }
});

test('Error when no text stream defined', function (t) {
  t.plan(1);
  try {
    email = emailStream({
      to: 'test@example.com',
      from: 'test@example.org',
      subject: 'EmailStream Test Subject'
    });
    t.fail();
  }
  catch (e) {
    t.equal(e.message, 'EmailStream no email body stream set');
  }
});

test('No error when text stream defined', function (t) {
  t.plan(1);
  try {
    email = emailStream({
      to: 'test@example.com',
      from: 'test@example.org',
      subject: 'EmailStream Test Subject',
      text: new PassThrough()
    });
    t.pass();
  }
  catch (e) {
    t.fail();
  }
});

test('Stream plain text email', function (t) {
  var text = new PassThrough();

  email = emailStream({
    to: 'test@example.com',
    from: 'test@example.org',
    subject: 'EmailStream Test Subject',
    text: text
  });
  streamed(email, function (output) {
    t.equal(output, readRawEmail('stream-plain-text-email'));
    t.end();
  });
  text.end('Hello world!');
});

test('Stream text & HTML email', function (t) {
  var text = new PassThrough();
  var html = new PassThrough();

  mock.overrideDateNow(function () { return '1111111111'; });
  output = [];
  email = emailStream({
    to: 'test@example.com',
    from: 'test@example.org',
    subject: 'EmailStream Test Subject',
    text: text,
    html: html
  });
  mock.restoreDateNow();
  email.on('data', output.push.bind(output));
  email.on('end', function () {
    t.equal(Buffer.concat(output).toString(), readRawEmail('stream-text-html-email'));
    t.end();
  });
  text.end('Hello world!');
  html.end('<html><body><p>Hello world!</body></html>');
});

test('Wraps plain text email', function (t) {
  var text = new PassThrough();

  output = [];
  email = emailStream({
    to: 'test@example.com',
    from: 'test@example.org',
    subject: 'EmailStream Test Subject',
    text: text
  });
  text.end('Lorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam pulvinar dui eget dui bibendum, et bibendum erat sagittis. Cras venenatis quam id velit pharetra, id tempor sem faucibus. Curabitur laoreet enim vitae sollicitudin venenatis. Suspendisse vitae pharetra erat. Integer in dignissim nibh, sed placerat velit. Nullam sit amet dui pretium.');
  email.on('data', output.push.bind(output));
  email.on('end', function () {
    t.equal(Buffer.concat(output).toString(), readRawEmail('wraps-plain-text-email'));
    t.end();
  });
});

test('Encodes HTML email', function (t) {
  var text = new PassThrough();
  var html = new PassThrough();

  output = [];
  mock.overrideDateNow(function () {
    return '1111111111';
  });
  email = emailStream({
    to: 'test@example.com',
    from: 'test@example.org',
    subject: 'EmailStream Test Subject',
    text: text,
    html: html
  });
  mock.restoreDateNow();
  text.end('Hello world!');
  email.on('data', function (data) {
    output += data.toString();
  });
  email.on('end', function () {
    t.equal(output, readRawEmail('encodes-html-email'));
    t.end();
  });
  html.end('<html><body><div class="quoted-printable-string"><p>Hello world!</p></div></body></html>');
});

test('Emits error when no attachments are added', function (t) {
  var text = new PassThrough();

  t.plan(1);
  email = emailStream({
    to: 'test@example.com',
    from: 'test@example.org',
    subject: 'EmailStream Test Subject',
    text: text,
    attachments: true
  });
  text.end('Hello world!');
  email.on('error', function (err) {
    t.equal(err.message, 'EmailStream no attachments added');
  });
  email.read();
});

test('Stream text and one attachment', function (t) {
  var text = new PassThrough();
  var attachment = new PassThrough();
  
  output = [];
  mock.overrideDateNow(function () {
    return '1111111111';
  });
  email = emailStream({
    to: 'test@example.com',
    from: 'test@example.org',
    subject: 'EmailStream Test Subject',
    text: text,
    attachments: true
  });
  mock.restoreDateNow();
  email.attach({
    type: 'text/svg',
    filename: 'circle.svg',
    body: attachment
  });
  text.end('Hello world!');
  attachment.end('<?xml version="1.0" encoding="UTF-8" standalone="no"?><svg xmlns="http://www.w3.org/2000/svg" width="500" height="500"><circle cx="250" cy="250" r="210" fill="#fff" stroke="#000" stroke-width="8"/></svg>\r\n');
  email.on('data', output.push.bind(output));
  email.on('end', function () {
    t.equal(Buffer.concat(output).toString(), readRawEmail('stream-text-and-one-attachment'));
    t.end();
  });
});

test('Stream text, html and one attachment', function (t) {
  var text = new PassThrough();
  var html = new PassThrough();
  var attachment = new PassThrough();
  
  output = [];
  mock.overrideDateNow(function () {
    return '1111111111';
  });
  email = emailStream({
    to: 'test@example.com',
    from: 'test@example.org',
    subject: 'EmailStream Test Subject',
    text: text,
    html: html,
    attachments: true
  });
  mock.restoreDateNow();
  email.attach({
    type: 'text/svg',
    filename: 'circle.svg',
    body: attachment
  });
  text.end('Hello world!');
  html.end('<html><body><div class="quoted-printable-string"><p>Hello world!</p></div></body></html>');
  attachment.end('<?xml version="1.0" encoding="UTF-8" standalone="no"?><svg xmlns="http://www.w3.org/2000/svg" width="500" height="500"><circle cx="250" cy="250" r="210" fill="#fff" stroke="#000" stroke-width="8"/></svg>\r\n');
  email.on('data', output.push.bind(output));
  email.on('end', function () {
    t.equal(Buffer.concat(output).toString(), readRawEmail('stream-text-html-and-one-attachment'));
    t.end();
  });
});
