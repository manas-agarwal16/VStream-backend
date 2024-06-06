import mongoose from "mongoose";

const OtpVerifySchema = new mongoose.Schema({
  OTP: {
    type: Number,
    default: null,
  },
  fullName: {
    type: String,
    require: true,
  },
  username: {
    //channel name
    type: String,
    require: true,
    trim: true,
    index: true, // gives index , optimal for searching
  },
  email: {
    type: String,
    require: true,
    lowercase: true,
  },
  password: {
    type: String,
    require: true,
  },
  description: {
    type: String,
    default: null,
  },
  avatar: {
    type: String, // cloudinary (or AWS) url stored in db,
    require: true,
  },
  coverImage: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

OtpVerifySchema.index({ createdAt: 1 }, { expireAfterSeconds: 300 });

export const OtpModel = mongoose.model("OtpModel", OtpVerifySchema);
