require('dotenv').config();
const nodemailer = require("nodemailer");

async function sendVerificationEmail(email, code) {
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: "salalshabbir242@gmail.com",   
      pass: process.env.EMAIL_PASS     
    }
  });

  const mailOptions = {
    from: "salalshabbir242@gmail.com",
    to: email,
    subject: "Verify Your Email (bazzar waly)",
    text: `Your verification code is: ${code}`
  };

  await transporter.sendMail(mailOptions);
}

module.exports = sendVerificationEmail;
