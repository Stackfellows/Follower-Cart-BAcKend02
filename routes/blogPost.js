// routes/blogPost.js

const express = require("express");
const router = express.Router();
const BlogPost = require("../models/BlogPost");
const auth = require("../middleware/auth"); // JWT auth middleware
const parser = require("../middleware/upload"); // Multer + Cloudinary setup

// @route   POST /followerApi/blogPosts
// @desc    Create a new blog post (Admin only)
// @access  Private
router.post("/", auth, parser.single("image"), async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ error: "Access denied: Admins only." });
    }

    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: "Title and content are required." });
    }

    const newPost = new BlogPost({
      title,
      content,
      author: req.user.name || "Admin",
      imageUrl: req.file?.path || "",
    });

    await newPost.save();
    res
      .status(201)
      .json({ msg: "Blog post created successfully!", post: newPost });
  } catch (error) {
    console.error("Error in creating blog post:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// @route   GET /followerApi/blogPosts
// @desc    Get all blog posts
// @access  Public
router.get("/", async (req, res) => {
  try {
    const posts = await BlogPost.find().sort({ createdAt: -1 });
    res.json(posts);
  } catch (error) {
    console.error("Error in fetching blog posts:", error);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
