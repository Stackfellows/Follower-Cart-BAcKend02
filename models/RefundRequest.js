// models/RefundRequest.js
const mongoose = require("mongoose");

const RefundRequestSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true },
    clientName: { type: String, required: true },
    clientEmail: { type: String, required: true },
    amount: { type: Number, required: true },
    reason: { type: String, required: true },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
    requestedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const RefundRequest = mongoose.model("RefundRequest", RefundRequestSchema);

module.exports = RefundRequest;
