//setup an email for sending status updates to the user
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendEmail = async (to, subject, text) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    text,
  };
  try {
    await transporter.sendMail(mailOptions);
    console.log("Email sent successfully");
  } catch (error) {
    console.error("Error sending email:", error);
  }
};

const sendStatusUpdate = async (to, subject, emailBody) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    html: emailBody,
  };
  try {
    await transporter.sendMail(mailOptions);
    console.log("Email sent successfully");
  } catch (error) {
    console.error("Error sending email:", error);
  }
};

const sendOTPEmail = async (to, otp) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: "Password Reset OTP",
    text: `Your OTP for password reset is: ${otp}\n\nThis OTP will expire in 10 minutes.\n\nIf you did not request this password reset, please ignore this email.`,
  };
  try {
    await transporter.sendMail(mailOptions);
    console.log("OTP email sent successfully");
    return true;
  } catch (error) {
    console.error("Error sending OTP email:", error);
    throw error;
  }
};

// A helper function to create the HTML. This keeps your main function clean.
const createGameEmailTemplate = ({ gameName, description, gameImage }) => {
  const primaryBlue = "#0D1CA2";
  const accentGold = "#E2C27B";
  const actionGreen = "#29B79B";

  const darkBg = "#1F2229"; // A softer, dark grey background
  const contentBg = "#2C303A"; // A lighter card background for clear separation
  const bodyText = "#E0E5F1"; // A bright, slightly cool off-white for excellent readability
  const whiteText = "#FFFFFF"; // Pure white for button text

  // --- Modern, System-Native Font Stack for Maximum Legibility ---
  const fontFamily =
    "'-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif";

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="color-scheme" content="light dark">
        <meta name="supported-color-schemes" content="light dark">
        <title>New Game Live: ${gameName}</title>
        <style>
            body { margin: 0; padding: 0; width: 100% !important; -webkit-text-size-adjust: 100%; }
        </style>
    </head>
    <body style="margin: 0; padding: 0; background-color:white;">
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: white">
            <tr>
                <td align="center" style="padding: 20px;">
                    <table width="600" border="0" cellpadding="0" cellspacing="0" style="width: 100%; max-width: 600px; background-color: ${contentBg}; border-radius: 12px; overflow: hidden;">
                        <!-- Hero Image -->
                        <tr>
                            <td>
                                <img src="${
                                  gameImage ||
                                  "https://images.unsplash.com/photo-1580234811497-9df7fd2f337e?q=80&w=1500"
                                }" alt="${gameName}" width="600" style="display: block; width: 100%; height: auto;">
                            </td>
                        </tr>
                        <tr>
                            <td align="center" style="padding: 40px 40px 45px 40px;">
                                <table width="100%" border="0" cellpadding="0" cellspacing="0">
                                    <!-- Sub-Title -->
                                    <tr>
                                        <td align="center" style="padding-bottom: 15px;">
                                            <h1 style="font-family: ${fontFamily}; font-size: 18px; font-weight: 600; color: ${accentGold}; letter-spacing: 0.5px; margin: 0;">
                                                A NEW CHALLENGE HAS ARRIVED
                                            </h1>
                                        </td>
                                    </tr>
                                    <!-- Game Name -->
                                    <tr>
                                        <td align="center" style="padding-bottom: 25px;">
                                            <h2 style="font-family: ${fontFamily}; font-size: 40px; font-weight: 800; color: ${actionGreen}; margin: 0;">
                                                ${gameName}
                                            </h2>
                                        </td>
                                    </tr>
                                    <!-- Description -->
                                    <tr>
                                        <td style="padding-bottom: 35px;">
                                            <p style="font-family: ${fontFamily}; font-size: 17px; color: #ffffff; line-height: 1.7; margin: 0; text-align: center;">
                                                ${
                                                  description ||
                                                  "A new arena awaits your skills. Gather your team, sharpen your strategy, and fight for victory!"
                                                }
                                            </p>
                                        </td>
                                    </tr>
                                    <!-- Call to Action Button -->
                                    <tr>
                                        <td align="center">
                                            <table border="0" cellpadding="0" cellspacing="0">
                                                <tr>
                                                    <td align="center" style="background-color: ${primaryBlue}; border-radius: 8px;">
                                                        <a href="https://ccg-game-app.netlify.app" target="_blank" style="display: inline-block; padding: 16px 40px; font-family: ${fontFamily}; font-size: 18px; font-weight: 700; color: ${whiteText}; text-decoration: none; border-radius: 8px;">
                                                            JOIN THE GAME
                                                        </a>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                    <!-- Signature -->
                                    <tr>
                                        <td align="center" style="padding-top: 45px;">
                                            <p style="font-family: ${fontFamily}; font-size: 14px; color: ${bodyText}; opacity: 0.6; margin: 0;">
                                                - The CCG Team
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
  `;
};

// The main function, now cleaner and more robust
const sendGameNotification = async (users, game) => {
  // 1. Get a clean list of recipient emails
  const toList = users.map((user) => user.email).filter(Boolean);

  // 2. Guard Clause: Don't proceed if there are no recipients
  if (!toList || toList.length === 0) {
    console.log("No valid users to send notification to. Skipping email send.");
    return;
  }

  // 3. Construct the email content using the helper
  const subject = `🎮 New Game Live: ${game.gameName}`;
  const html = createGameEmailTemplate({
    gameName: game.gameName,
    description: game.description,
    gameImage: game.gameImage, // Pass the image
    gameUrl: `https://yourwebsite.com/games/${game.id}`, // Pass a dynamic URL
  });

  // 4. Set mail options
  const mailOptions = {
    from: process.env.EMAIL_USER,
    bcc: toList, // Using BCC is a great practice for privacy!
    subject,
    html,
  };

  // 5. Send the email with proper error handling
  try {
    await transporter.sendMail(mailOptions);
    console.log(
      `Game notification for "${game.gameName}" sent to ${toList.length} users.`
    );
  } catch (error) {
    console.error("Failed to send game notification:", error);
  }
};

module.exports = {
  sendEmail,
  sendStatusUpdate,
  sendOTPEmail,
  sendGameNotification,
};
