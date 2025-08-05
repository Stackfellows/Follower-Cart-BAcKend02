const express = require("express");
const router = express.Router();
const User = require("../models/User");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

module.exports = (transporter) => {
  // Helper function to send email
  const sendEmail = async (to, subject, htmlContent) => {
    if (!transporter) {
      console.warn("Nodemailer transporter is not configured. Email not sent.");
      return { success: false, error: "Email transporter not available." };
    }
    try {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: to,
        subject: subject,
        html: htmlContent,
      };
      let info = await transporter.sendMail(mailOptions);
      console.log("Message sent: %s", info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error("Error sending email:", error);
      return { success: false, error: error.message };
    }
  };

  // POST /followerApi/forgotpassword - Request password reset
  router.post("/forgotpassword", async (req, res) => {
    try {
      const { email } = req.body;
      const user = await User.findOne({ email });

      if (!user) {
        // Security reasons ke liye, humesha success response hi return karein,
        // bhale hi user na mile.
        return res.status(200).json({
          msg: "If an account with that email exists, a password reset link has been sent.",
        });
      }

      // Generate aur set karein password reset token
      const resetToken = user.getResetPasswordToken();
      await user.save({ validateBeforeSave: false });

      // Create the reset URL
      const frontendResetUrl = `${process.env.FRONTEND_URL}/resetpassword/${resetToken}`;

      const htmlContent = `
        <h1>Password Reset Request</h1>
        <p>You have requested to reset your password. Please click the link below to reset your password:</p>
        <a href="${frontendResetUrl}" target="_blank">Reset Password</a>
        <p>This link will expire in 10 minutes.</p>
        <p>If you did not request this, please ignore this email.</p>
      `;

      // Email bhejein
      const emailResult = await sendEmail(
        user.email,
        "Password Reset Request",
        htmlContent
      );

      if (emailResult.success) {
        res.status(200).json({
          msg: "Password reset email sent successfully. Please check your inbox.",
        });
      } else {
        res.status(500).json({
          msg: "Failed to send password reset email.",
          error: emailResult.error,
        });
      }
    } catch (err) {
      console.error("Forgot Password Error:", err);
      res.status(500).json({
        msg: "Server error during forgot password request",
        error: err.message,
      });
    }
  });

  // PATCH /followerApi/resetpassword/:token - Reset password
  router.patch("/resetpassword/:token", async (req, res) => {
    try {
      const resetPasswordToken = crypto
        .createHash("sha256")
        .update(req.params.token)
        .digest("hex");

      const user = await User.findOne({
        resetPasswordToken,
        resetPasswordExpire: { $gt: Date.now() },
      }).select("+password");

      if (!user) {
        return res
          .status(400)
          .json({ msg: "Invalid or expired password reset token." });
      }

      const { newPassword, confirmNewPassword } = req.body;

      if (!newPassword || !confirmNewPassword) {
        return res
          .status(400)
          .json({ msg: "Please provide both new and confirm password." });
      }

      if (newPassword !== confirmNewPassword) {
        return res.status(400).json({ msg: "Passwords do not match." });
      }

      user.password = newPassword;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();

      res.status(200).json({ msg: "Password reset successfully." });
    } catch (err) {
      console.error("Reset Password Error:", err);
      res.status(500).json({
        msg: "Server error during password reset",
        error: err.message,
      });
    }
  });

  return router;
};
