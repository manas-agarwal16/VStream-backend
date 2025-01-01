//https://app.eraser.io/workspace/YtPqZ1VogxGy1jzIDkzj : model link
import mongoose from "mongoose";
import bcrypt from "bcrypt"; //middleware (pre hook) , encrypts the password before saving.
import jwt from "jsonwebtoken";

const userSchema = new mongoose.Schema(
  {
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
    watchHistory: {
      type: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Video",
      }],
      default: [],
    },
    refreshToken: {
      type: String,
      default: undefined,
    },
    avatar: {
      type: String, // cloudinary (or AWS) url stored in db,
      default:
        "https://cdn.pixabay.com/photo/2016/09/28/02/14/user-1699635_1280.png",
    },
    coverImage: {
      type: String,
    },
    premium: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  // pre hook
  try {
    if (this.isModified("password")) {
      // its suggesting that await has no use but its necessary.
     this.password = await bcrypt.hash(this.password, 10); //10 : no. of salt rounds
    }
    next();
  } catch (error) {
    console.log("error in hashing the password");
    throw error;
  } //call next middleware.
});

//mongoose gives us .methods object to create our own custom methods
//creating our custom method to check if passed password is correct.
userSchema.methods.isCorrectPassword = async function (password) {
  try {
    console.log("dbPassword: ", this.password);
    const check = await bcrypt.compare(password, this.password); //this.password refers to document password.
    return check; //boolean value.
  } catch (error) {
    console.log("error is comparing the passwords");
    throw error;
  }
};

//jwt.sign(payloads,secretKey,{expiresIn : expiryKey}) to generator token
userSchema.methods.generateAccessToken = async function () {
  console.log("expiry : ", process.env.ACCESS_TOKEN_EXPIRY);

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
