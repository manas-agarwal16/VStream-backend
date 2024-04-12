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
      trim: true, // gives index , optimal for searching
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
    watchHistory: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Video",
        },
      ],
      require: true,
      unique: true,
    },
    fullName: {
      type: String,
      require: true,
    },
    avatar: {
      type: String, // cloudinary (or AWS) url stored in db,
      require: true,
    },
    coverimage: {
      type: String,
    },
    refreshToken: {
      type: String,
      unique: true,
    },
  },
  { timestamps: true }
);

//In document(db's model's document) middleware functions, 'this' refers to the document. To access the model, use this.constructor.

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
  jwt.sign(
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
  jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_KEY,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
  );
};

export const User = mongoose.model("User", userSchema);
