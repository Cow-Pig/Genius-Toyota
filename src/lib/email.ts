import nodemailer from 'nodemailer';

const GMAIL_ADDRESS = 'toyotatest967@gmail.com';
const GMAIL_APP_PASSWORD = 'hqdd xwpv mwgu lwuk';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: GMAIL_ADDRESS,
    pass: GMAIL_APP_PASSWORD,
  },
});

export interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendEmail(options: SendEmailOptions) {
  await transporter.sendMail({
    from: `Genius Toyota <${GMAIL_ADDRESS}>`,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html ?? options.text.replace(/\n/g, '<br />'),
  });
}
