/*jslint stupid: true */
var test = require('tape');
var emailStream = require('..');
var PassThrough = require('stream').PassThrough;
var fs = require('fs');
var path = require('path');
var email;

function readRawEmail(filename) {
  return fs.readFileSync(path.join(__dirname, 'raw-emails', filename)).toString();
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

//test('No error when HTML stream defined', function (t) {
  //t.plan(1);
  //try {
    //email = emailStream({
      //to: 'test@example.com',
      //from: 'test@example.org',
      //subject: 'EmailStream Test Subject',
      //html: new PassThrough()
    //});
    //t.pass();
  //}
  //catch (e) {
    //t.fail();
  //}
//});


test('Stream plain text email', function (t) {
  var output = [];
  var text = new PassThrough();

  email = emailStream({
    to: 'test@example.com',
    from: 'test@example.org',
    subject: 'EmailStream Test Subject',
    text: text
  });
  email.on('data', output.push.bind(output));
  email.on('end', function () {
    t.equal(Buffer.concat(output).toString(), readRawEmail('stream-plain-text-email'));
    t.end();
  });
  text.end('Hello world!');
});

test('Stream text & HTML email', function (t) {
  var oldDateNow = Date.now;
  var output = [];
  var text = new PassThrough();
  var html = new PassThrough();

  Date.now = function () {
    return '1111111111';
  };
  email = emailStream({
    to: 'test@example.com',
    from: 'test@example.org',
    subject: 'EmailStream Test Subject',
    text: text,
    html: html
  });
  email.on('data', output.push.bind(output));
  email.on('end', function () {
    t.equal(Buffer.concat(output).toString(), readRawEmail('stream-text-html-email'));
    t.end();
  });
  text.end('Hello world!');
  html.end('<html><body><p>Hello world!</body></html>');
});

//test('Wraps plain text email', function (t) {
  //var output = '';
  //email = emailStream({
    //to: 'test@example.com',
    //from: 'test@example.org',
    //subject: 'EmailStream Test Subject'
  //});
  //email.text().end('Lorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam pulvinar dui eget dui bibendum, et bibendum erat sagittis. Cras venenatis quam id velit pharetra, id tempor sem faucibus. Curabitur laoreet enim vitae sollicitudin venenatis. Suspendisse vitae pharetra erat. Integer in dignissim nibh, sed placerat velit. Nullam sit amet dui pretium.');
  //email.on('data', function (data) {
    //output += data.toString();
  //});
  //email.on('end', function () {
    //t.equal(output, readRawEmail('email3'));
    //t.end();
  //});
//});

//test('Encodes HTML email', function (t) {
  //var oldDateNow = Date.now;
  //var output = '';
  //Date.now = function () {
    //return '1111111111';
  //};
  //email = emailStream({
    //to: 'test@example.com',
    //from: 'test@example.org',
    //subject: 'EmailStream Test Subject'
  //});
  //email.text().end('Hello world!');
  //email.html();
  //email.on('data', function (data) {
    //output += data.toString();
  //});
  //email.on('end', function () {
    //t.equal(output, readRawEmail('email4'));
    //t.end();
  //});
  //email.html().end('<html><body><div class="quoted-printable-string"><p>Hello world!</p></div></body></html>');
  //Date.now = oldDateNow;
//});
