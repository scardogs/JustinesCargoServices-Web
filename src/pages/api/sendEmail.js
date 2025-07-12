import nodemailer from "nodemailer";
import { google } from "googleapis";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { email } = req.body; // Email from the login request

    // Check if the logged-in user is the specific Gmail user
    if (email !== process.env.EMAIL_USER) {
      return res
        .status(200)
        .json({ message: "No email sent. Not the target user." });
    }

    const OAuth2Client = new google.auth.OAuth2(
      process.env.EMAIL_CLIENT_ID,
      process.env.EMAIL_CLIENT_SECRET,
      "https://developers.google.com/oauthplayground"
    );

    OAuth2Client.setCredentials({
      refresh_token: process.env.EMAIL_REFRESH_TOKEN,
    });

    const accessToken = await OAuth2Client.getAccessToken();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: process.env.EMAIL_USER,
        clientId: process.env.EMAIL_CLIENT_ID,
        clientSecret: process.env.EMAIL_CLIENT_SECRET,
        refreshToken: process.env.EMAIL_REFRESH_TOKEN,
        accessToken: accessToken.token,
      },
    });

    const mailOptions = {
      from: `"Login Alert" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      subject: "Login Notification",
      text: `Your Gmail account (${email}) was used to log in.`,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: "Email sent successfully!" });
  } catch (error) {
    console.error("Email Error:", error);
    res.status(500).json({ error: "Failed to send email" });
  }
}
