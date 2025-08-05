// Load environment variables from .env file
require("dotenv").config(); // THIS MUST BE THE VERY FIRST LINE

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cloudinary = require("cloudinary").v2;
const nodemailer = require("nodemailer");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const jwt = require("jsonwebtoken");
const User = require("./models/User");

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
app.use(passport.initialize());

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
// ✅ FIXED: Passport.js setup for Google OAuth
// ===================================
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.BACKEND_URL}/followerApi/auth/google/callback`, // ✅ FIXED HERE
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile.id });
        if (!user) {
          user = await User.findOne({ email: profile.emails[0].value });
          if (user) {
            user.googleId = profile.id;
            await user.save();
          }
        }
        if (!user) {
          const newUser = await User.create({
            googleId: profile.id,
            name: profile.displayName,
            email: profile.emails[0].value,
            role: "user",
          });
          return done(null, newUser);
        }
        done(null, user);
      } catch (err) {
        done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findById(id).then((user) => {
    done(null, user);
  });
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

// ✅ Google Auth Routes
// ✅ Google Auth Routes
app.get(
  "/followerApi/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get(
  "/followerApi/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${process.env.FRONTEND_URL}/login`,
    session: false,
  }),
  (req, res) => {
    const token = jwt.sign(
      { id: req.user._id, role: req.user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    res.redirect(
      `${process.env.FRONTEND_URL}/login?token=${token}&role=${req.user.role}`
    );
  }
);

// ✅ Default root route to avoid "Cannot GET /"
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
