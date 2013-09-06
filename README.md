# EmailStream

This is a very early release of something that I would welcome any help with. I appreciate that I am unlikely to have covered all of the RFCs that cover the email specifications. Please submit pull requests, issues and anything else.

EmailStream is a module to allow you to build a raw email stream from multiple streams.

## Installation

    npm install email-stream

## Usage

    var emailStream = require('email-stream');
    var email = emailStream({
      to: 'test@example.com',
      from: 'test@example.org',
      subject: 'Test Subject',
      text: textStream,
      html: htmlStream
    });

    // Pipe the textStream
    // Pipe the htmlStream
    email.pipe(process.stdout);

## Notes

A text stream is required for all emails and a HTML stream is optional

## Attachments

If you want to add attachments to the email, add `attachments: true` to the initialisation function. Eg.

    var email = emailStream({
      to: 'test@example.com',
      ...
      attachments: true
    });

    email.attach({
      filename: 'attachment.svg',
      type: 'text/svg',
      body: attachmentStream
    });

    email.attach({
      filename: 'attachment2.mp4',
      type: 'video/mp4',
      body: attachmentStream2
    });
