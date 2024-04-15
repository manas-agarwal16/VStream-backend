//https://app.eraser.io/workspace/YtPqZ1VogxGy1jzIDkzj : model link
import mongoose from "mongoose";
import bcrypt from "bcrypt"; //middleware (pre hook) , encrypts the password before saving.
import jwt from "jsonwebtoken";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      require: true,
      unique: true,
      trim: true,
      index: true, // gives index , optimal for searching
    },
    email: {
      type: String,
      require: true,
      lowercase: true,
      unique: true,
    },
    password: {
      type: String,
      require: true,
    },
    fullName: {
      type: String,
      require: true,
    },
    watchHistory: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
    refreshToken: {
      type: String,
      default: "",
    },
    avatar: {
      type: String, // cloudinary (or AWS) url stored in db,
      require: true,
    },
    coverImage: {
      type: String,
    },
  },
  { timestamps: true }
);

//In document(db's model's document) middleware functions, 'this' refers to the document of the current user who is logged in. To access the model, use this.constructor.

//since we have to access the properties of document and we have to use 'this' keyword for that we cann't use arrow functions, coz 'this' keyword doesn't have context of arrow function.
userSchema.pre("save", async function (next) {
  // pre hook
  if (this.isModified("password")) {
    //isModified checks if the data is modified and "password" / anything has to be passed as string.
    this.password = await bcrypt.hash(this.password, 10); //10 : no. of salt rounds
  }
  next(); //call next middleware.
});

//creating our custom method to check if passed password is correct.
//mongoose gives us .methods object to create our own custom methods
userSchema.methods.isCorrectPassword = async function (password) {
  const check = await bcrypt.compare(password, this.password); //this.password refers to document password.
  return check; //boolean value.
};

//jwt.sign(payloads,secretKey,{eexpiresIn : expiryKey}) to generator token
userSchema.methods.generateAccessToken = async function () {
  return jwt.sign(
    {
      _id: this._id, //auto saved by mongodb
      email: this.email,
      username: this.username,
      fullName: this.fullName,
    },
    process.env.ACCESS_TOKEN_KEY,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
  );
};

userSchema.methods.generateRefreshToken = async function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_KEY,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
  );
};

export const User = mongoose.model("User", userSchema);
