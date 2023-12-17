const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');

const email = process.env.EMAIL_USERNAME;

const getEmailTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: email,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

const sendEmail = async (to, subject, html, from = null) => {
  const transporter = getEmailTransporter();
  const mailOptions = {
    from: email,
    replyTo: from || email,
    to,
    subject,
    html,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

const getEmailTemplate = async (templateName, data) => {
  try {
    const templatePath = path.join(
      __dirname,
      'emailTemplates',
      `${templateName}.html`
    );
    let html = await fs.readFile(templatePath, 'utf8');

    data.websiteURL = `https://www.${process.env.FUNCTION.toLowerCase()}.com`;
    data.emailAssetPath = `https://www.${process.env.FUNCTION.toLowerCase()}.com/assets/img/email/`;

    data.title = process.env.FUNCTION;
    // Replace placeholders with data
    for (const key in data) {
      const placeholder = `{${key}}`;
      html = html.replace(new RegExp(placeholder, 'g'), data[key]);
    }

    return html;
  } catch (error) {
    console.error(`Error reading email template "${templateName}":`, error);
    return null;
  }
};

const sendTemplatedEmail = async (templateName, subject, data) => {
  const emailData = await getEmailTemplate(templateName, data);
  if (emailData) {
    await sendEmail(data.email, subject, emailData);
  } else {
    console.error(`Error: Email template "${templateName}" not found.`);
  }
};

module.exports = sendTemplatedEmail;
