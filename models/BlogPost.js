// models/BlogPost.js
const mongoose = require("mongoose");

const BlogPostSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, unique: true },
    content: { type: String, required: true },
    author: { type: String, default: "Admin", trim: true },
    snippet: { type: String, trim: true, maxlength: 1000 },
    imageUrl: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

BlogPostSchema.pre("save", function (next) {
  if (!this.snippet && this.content) {
    this.snippet =
      this.content.substring(0, 150) + (this.content.length > 150 ? "..." : "");
  }
  next();
});

module.exports = mongoose.model("BlogPost", BlogPostSchema);
