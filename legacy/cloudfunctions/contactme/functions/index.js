'use strict';

const functions = require('firebase-functions');
const nodemailer = require('nodemailer');
// Configure the email transport using the default SMTP transport and a GMail account.
// For Gmail, enable these:
// 1. https://www.google.com/settings/security/lesssecureapps
// 2. https://accounts.google.com/DisplayUnlockCaptcha
// For other types of transports such as Sendgrid see https://nodemailer.com/transports/
// TODO: Configure the `gmail.email` and `gmail.password` Google Cloud environment variables.
const gmailEmail = functions.config().gmail.email;
const gmailPassword = functions.config().gmail.password;
const mailTransport = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: gmailEmail,
    pass: gmailPassword,
  },
});
// [START sendEmailNotification]
/**
 * Sends a notification to self when someone contacts you 
 */
// [START onWriteTrigger]
exports.sendEmailNotification = functions.firestore.
    document('messages/{messageID}')
    .onWrite((change, context) => {
      // [END onWriteTrigger]
      const newMessage = change.after.data()
      const { subject, message } = newMessage
    return sendEmailNotification(subject, message);
  });
// [END sendEmailNotification]


  // Sends a welcome email to the given user.
async function sendEmailNotification(subject, message) {
  const mailOptions = {
    from: `Blog Notifications <noreply@firebase.com>`,
    to: gmailEmail,
  };

  // The user subscribed to the newsletter.
  mailOptions.subject = subject
  mailOptions.text = message
  await mailTransport.sendMail(mailOptions);
  return null;
}