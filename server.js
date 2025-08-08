// Load environment variables from .env file
require("dotenv").config(); // THIS MUST BE THE VERY FIRST LINE

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cloudinary = require("cloudinary").v2;
const nodemailer = require("nodemailer");

// Initialize Express app
const app = express();

// ===================================
// Middleware Configuration
// ===================================
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
const corsOptions = {
  origin: "*",
  methods: ["GET", "POST", "PATCH", "DELETE", "PUT", "OPTIONS"],
  credentials: true,
};
app.use(cors(corsOptions));

// Nodemailer transporter setup
let transporter = null;
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  transporter.verify(function (error, success) {
    if (error) {
      console.error("❌ Nodemailer transporter verification failed:");
      console.error("Error details:", error.response || error.message);
    } else {
      console.log("✅ Nodemailer transporter ready for sending emails");
    }
  });
} else {
  console.warn(
    "⚠️ Nodemailer: EMAIL_USER or EMAIL_PASS not set in .env. Email notifications will be disabled."
  );
}

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// ===================================
// Database Connection
// ===================================
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("✅ MongoDB connected successfully.");
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
  });

// ===================================
// Routes
// ===================================
const authRoutes = require("./routes/auth")(transporter); // Pass transporter to the auth routes
const forgotPasswordRoutes = require("./routes/forgotPassword")(transporter); // Pass transporter

app.use("/followerApi", authRoutes);
app.use("/followerApi", forgotPasswordRoutes);

// Default root route to avoid "Cannot GET /"
app.get("/", (req, res) => {
  res.send("🚀 API is running! Welcome to FollowersCart backend.");
});

// ===================================
// Start the Server
// ===================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
