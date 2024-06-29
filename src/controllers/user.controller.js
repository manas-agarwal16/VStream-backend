import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/users.model.js"; // User has all access to DB.
import {
  uploadOncloudinary,
  deleteFileFromCloudinary,
} from "../utils/cloudinary.js";

import bcrypt from "bcrypt";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import { generateOTP, sendOTPThroughEmail } from "../utils/otp_generator.js";
import { OtpModel } from "../models/Otp.model.js";
import mongoose from "mongoose";

//clear
const registerUser = asyncHandler(async (req, res) => {
  let { username, email, fullName, password, description } = req.body;

  if (!fullName || !username || !email || !password) {
    throw new ApiError(400, "All fields are required");
  }

  email = email.toLowerCase().trim();
  username = username.toLowerCase().trim();

  let existedUser = await User.findOne({ email }); //returns length
  if (existedUser) {
    throw new ApiError(409, "email already exists");
  }
  existedUser = await User.findOne({ username });
  if (existedUser) {
    throw new ApiError(409, "username already exists");
  }

  existedUser = await OtpModel.findOne({ email });
  if (existedUser) {
    throw new ApiError(409, "email already exists");
  }
  existedUser = await OtpModel.findOne({ username });
  if (existedUser) {
    throw new ApiError(409, "username already exists");
  }

  //file upload.
  let coverImageLocalPath;
  if (req.files && req.files.coverImage && req.files.coverImage[0]) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }
  let avatarLocalPath;
  if (req.files && req.files.avatar && req.files.avatar[0]) {
    avatarLocalPath = req.files.avatar[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "avatar is required");
  }

  const cloudinaryAvatarURL = await uploadOncloudinary(avatarLocalPath);

  let cloudinaryCoverImageURL;

  if (coverImageLocalPath) {
    cloudinaryCoverImageURL = await uploadOncloudinary(coverImageLocalPath);
    if (!cloudinaryCoverImageURL) {
      throw new ApiError(500, "coverImage not saved try again");
    }
  }

  if (!cloudinaryAvatarURL) {
    throw new ApiError(500, "avatar not saved try again");
  }

  const OTP = generateOTP();

  const pendingUser = new OtpModel({
    username,
    fullName,
    email,
    avatar: cloudinaryAvatarURL.url,
    coverImage: cloudinaryCoverImageURL?.url || "",
    password,
    description,
    OTP,
  });

  await pendingUser
    .save()
    .then(() => {
      console.log("user saved to db successfully");
    })
    .catch((err) => {
      throw new ApiError(501, "error in saving user to db");
    });

  await sendOTPThroughEmail(email, OTP)
    .then(() => {
      res
        .status(201)
        .json(
          new ApiResponse(
            201,
            "An OTP has been sent to your email for verification"
          )
        );
    })
    .catch((error) => {
      console.error("Error sending OTP through email:", error);
      res
        .status(501)
        .json(new ApiResponse(500, "Error sending OTP through gmail"));
    });
});

//clear
const resendOTP = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const OTP = generateOTP();

  const updateOTP = await OtpModel.findOneAndUpdate(
    { email: email },
    { OTP: OTP }
  );
  if (!updateOTP) {
    throw new ApiError(
      401,
      "Email not found or expired. Try Registering again"
    );
  }

  await sendOTPThroughEmail(email, OTP)
    .then(() => {
      res
        .status(201)
        .json(
          new ApiResponse(
            201,
            "An OTP has been send to your email for verification"
          )
        );
    })
    .catch((err) => {
      throw new ApiError(401, "Error in sending email", err);
    });
});

//clear
const verifyOTP = asyncHandler(async (req, res) => {
  const { OTP, email } = req.body;
  if (!OTP || !email) {
    throw new ApiError(401, "OTP and email required");
  }

  let dbOTP = await OtpModel.findOne({ email: email });

  if (!dbOTP) {
    res
      .status(201)
      .json(new ApiResponse(201, "Email has expired. Register again"));
  }

  dbOTP = dbOTP.OTP;

  if (dbOTP !== OTP) {
    throw new ApiError(401, "Wrong OTP. Try again");
  }

  await OtpModel.findOneAndUpdate({ email: email }, { $set: { OTP: null } });

  const verifiedUser = await OtpModel.findOne({ email }).select(
    "-OTP -createdAt -_id -__v"
  );

  console.log(verifiedUser);

  const user = new User({
    fullName: verifiedUser.fullName,
    username: verifiedUser.username,
    password: verifiedUser.password,
    email: verifiedUser.email,
    description: verifiedUser.description,
    avatar: verifiedUser.avatar,
    coverImage: verifiedUser.coverImage,
  });
  
  const deleteUserFromOtpModel = await OtpModel.findOneAndDelete({email : email});

  if(!deleteFileFromCloudinary){
    throw new ApiError(501,"error in deleting user from OTP model");
  }
  await user
    .save()
    .then(() => {
      res
        .status(201)
        .json(new ApiResponse(201, "User registered successfully"));
    })
    .catch((err) => {
      console.log(user);
      throw new ApiError(501, "error in registering the user", err);
    });
});

//clear
const loginUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  if ((!username && !email) || !password) {
    throw new ApiError(400, "All fields are required.");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }], //find on the basis of username or email.
  });

  if (!user) {
    throw new ApiError(400, "username or email is not registered yet");
  }

  const validPassword = await user.isCorrectPassword(password);
  if (!validPassword) {
    throw new ApiError(400, "wrong password!!! try again");
  }

  const accessToken = await user.generateAccessToken();
  const refreshToken = await user.generateRefreshToken();

  if (!accessToken) {
    throw new ApiError(500, "error in creating access token");
  }
  if (!refreshToken) {
    throw new ApiError(500, "error in creating refresh token");
  }

  const setRefreshToken = await User.findOneAndUpdate(
    {
      $or: [{ username }, { email }], //find on the basis of username or email.
    },
    { refreshToken: refreshToken }
  );

  if (!setRefreshToken) {
    throw new ApiError(501, "error in updating refresh Token");
  }

  const options = {
    httpOnly: true, // only server can access cookie not client side.
    secure: true, // cookie is set over secure and encrypted connections.
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(201, user._id, "user has logged in successfully"));
});

//clear
const logoutUser = asyncHandler(async (req, res) => {
  const { _id } = req.user;

  const updateRefreshToken = await User.findByIdAndUpdate(
    { _id: _id },
    { refreshToken: undefined },
    {
      new: true,
    }
  );

  if (!updateRefreshToken) {
    throw new ApiError(501, "error in updating refresh token");
  }

  const options = {
    httpOnly: true,
    secure: true,
  };

  res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
      new ApiResponse(
        201,
        { username: req.user.username },
        `${req.user.username} has logged out successfully`
      )
    );
});

//clear
const changePassword = asyncHandler(async (req, res) => {
  let { oldPassword, newPassword } = req.body;

  if (!newPassword || !oldPassword) {
    throw new ApiError(401, "enter your passwords");
  }
  const user = req.user;

  let userWithPassword = await User.findById({ _id: user._id });

  const correctPassword = await userWithPassword.isCorrectPassword(oldPassword);

  if (!correctPassword) {
    throw new ApiError(401, "wrong old password");
  }

  const newHashPassword = await bcrypt.hash(newPassword, 10);

  if (!newHashPassword) {
    throw new ApiError(501, "error in hashing password");
  }
  const updatePassword = await User.findByIdAndUpdate(
    { _id: user._id },
    { password: newHashPassword }
  );
  if (!updatePassword) {
    throw new ApiError(501, "error in updating password");
  }

  res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { username: user.username },
        "your password has being changed successfully!!"
      )
    );
});

//clear
const updateAvatar = asyncHandler(async (req, res) => {
  let avatarLocalPath;

  if (req.files && req.files.avatar && req.files.avatar[0]) {
    avatarLocalPath = req.files.avatar[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(401, "avatar is required!!!");
  }

  const newAvatar = await uploadOncloudinary(avatarLocalPath);

  if (!newAvatar) {
    throw new ApiError(501, "error in uploading new avatar to cloudinary.");
  }
  const user = req.user;

  //deleting oldAvatar from cloudinary: 'http://res.cloudinary.com/dgrm75hbj/image/upload/v1713352206/b4itkxym6dcywvwqvuwu.png', this provided url on file upload by cloudinary contains the unique public_id of a file which is required to delete a specific file , extracting that public_id below;
  const oldAvatar = user.avatar;
  let oldAvatarPublic_id = oldAvatar.replace(
    "http://res.cloudinary.com/dgrm75hbj/image/upload/",
    ""
  );

  const array = oldAvatarPublic_id.split("/"); //string to array based on "/";

  oldAvatarPublic_id = array[1].replace(".png", "");
  console.log(oldAvatarPublic_id);

  const deletionResult = await deleteFileFromCloudinary(oldAvatarPublic_id);

  if (!deletionResult) {
    throw new ApiResponse(501, "error in deleting old avatar from clouinary!!");
  }

  const updateAvatar = await User.findByIdAndUpdate(
    { _id: user._id },
    { avatar: newAvatar.url }
  );

  if (!updateAvatar) {
    throw new ApiError(501, "error in updating avatar");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, user, "avatar has been updated successfully."));
});

//clear
const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "unauthorized request");
  }
  const decodedIncomingRefreshToken = await jwt.verify(
    incomingRefreshToken,
    process.env.REFRESH_TOKEN_KEY
  );

  if (!decodedIncomingRefreshToken) {
    throw new ApiError(501, "error in decoding refresh token");
  }

  const user = await User.findOne({ _id: decodedIncomingRefreshToken._id });

  if (!user) {
    throw new ApiError(401, "Invalid refreshToken");
  }

  const dbRefreshToken = user.refreshToken;

  if (!dbRefreshToken) {
    throw new ApiError(401, "user has logged out already!!!");
  }

  const newAccessToken = await user.generateAccessToken();
  const newRefreshToken = await user.generateRefreshToken();

  // console.log("newAcessToken: ", newAccessToken);
  if (!newAccessToken) {
    throw new ApiError(501, "error is generating accessToken");
  }

  if (!newRefreshToken) {
    throw new ApiError(501, "error in generating refresh token");
  }

  const saveRefreshToken = await User.findByIdAndUpdate(
    { _id: user._id },
    { refreshToken: newRefreshToken },
    { new: true }
  );

  if (!saveRefreshToken) {
    throw new ApiError(501, "error in saving new refresh token");
  }

  const options = {
    httpOnly: true,
    secure: true,
  };
  res
    .status(201)
    .cookie("accessToken", newAccessToken, options) //AccessToken cookie's value will get replaced by newAccessToken.
    .cookie("refreshToken", newRefreshToken, options)
    .json(
      new ApiResponse(
        201,
        {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          username: user.username,
        },
        "accesstoken is refreshed successfully!!!"
      )
    );
});

//clear
const removeCoverImage = asyncHandler(async (req, res) => {
  const user = req.user;
  const oldCoverImage = user.coverImage;

  if (oldCoverImage) {
    let oldCoverImagePublic_id = oldCoverImage.replace(
      "http://res.cloudinary.com/dgrm75hbj/image/upload/",
      ""
    );

    const array = oldCoverImagePublic_id.split("/"); //string to array based on "/";

    oldCoverImagePublic_id = array[1].replace(".png", "");

    const deletionResult = await deleteFileFromCloudinary(oldAvatarPublic_id);

    if (!deletionResult) {
      throw new ApiResponse(
        501,
        "error in deleting old coverImage from cloudinary!!"
      );
    }
  }
  const removeCoverImage = await User.findById(
    { _id: user._id },
    { refreshToken: "" }
  );
  if (!removeCoverImage) {
    throw new ApiError(501, "error in removing Cover Image");
  }
  res
    .status(201)
    .json(new ApiResponse(201, "coverImage has been removed succesfully!"));
});

//clear
const updateCoverImage = asyncHandler(async (req, res) => {
  const user = req.user;

  let coverImageLocalPath;
  if (req.files && req.files.coverImage && req.files.coverImage[0]) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!coverImageLocalPath) {
    throw new ApiError(
      401,
      "coverImage is required to update it.Else remove the coverImage"
    );
  }

  const oldCoverImage = user.coverImage;

  if (oldCoverImage) {
    let oldCoverImagePublic_id = oldCoverImage.replace(
      "http://res.cloudinary.com/dgrm75hbj/image/upload/",
      ""
    );

    const array = oldCoverImagePublic_id.split("/"); //string to array based on "/";

    oldCoverImagePublic_id = array[1].replace(".png", "");

    const deletionResult = await deleteFileFromCloudinary(
      oldCoverImagePublic_id
    );

    if (!deletionResult) {
      throw new ApiResponse(
        501,
        "error in deleting old coverImage from cloudinary!!"
      );
    }
  }
  const newCoverImage = await uploadOncloudinary(coverImageLocalPath);

  if (!newCoverImage) {
    throw new ApiError(501, "error in uploading coverImage to cloudinary!");
  }

  const changeCoverImage = await User.findByIdAndUpdate(
    { _id: user._id },
    { coverImage: newCoverImage.url },
    {
      new: true,
    }
  );

  if (!changeCoverImage) {
    throw new ApiError(501, "error in uploading cover image to cloudinary");
  }

  res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { coverImage: changeCoverImage.coverImage },
        "coverimage have been updated successfully"
      )
    );
});

//clear
const userProfile = asyncHandler(async (req, res) => {
  let { username } = req.params;
  console.log(username);

  const user = req.user;

  username = username.toLowerCase().trim();
  if (!username) {
    throw new ApiError(401, "username required");
  }

  const exists = await User.findOne({username : username});
  if(!exists){
    throw new ApiError(404,"no such username exists");
  }

  // let channel = await User.aggregate([
  //   {
  //     $match: {
  //       username: username,
  //     },
  //   },
  //   {
  //     $lookup: {
  //       from: "videos",
  //       localField: "_id",
  //       foreignField: "owner",
  //       as: "allVideos",
  //     },
  //   },
  //   {
  //     $addFields: {
  //       numberOfVideos: { $size: "$allVideos" },
  //     },
  //   },
  //   {
  //     $unwind: "$allVideos",
  //   },
  //   {
  //     $sort: { "allVideos.createdAt": -1 },
  //   },
  //   {
  //     $group: {
  //       _id: "$_id",
  //       fullName: { $first: "$fullName" },
  //       username: { $first: "$username" },
  //       email: { $first: "$email" },
  //       description: { $first: "$description" },
  //       avatar: { $first: "$avatar" },
  //       allVideos: { $push: "$allVideos" },
  //       coverImage: { $first: "$coverImage" },
  //       numberOfVideos: { $first: "$numberOfVideos" },
  //       recentVideos: { $push: "$allVideos" },
  //     },
  //   },
  //   {
  //     $addFields: {
  //       recentVideos: { $slice: ["$recentVideos", 4] },
  //     },
  //   },
  //   {
  //     $unwind: "$allVideos",
  //   },
  //   {
  //     $sort: { "allVideos.views": -1 },
  //   },
  //   {
  //     $group: {
  //       _id: "$_id",
  //       fullName: { $first: "$fullName" },
  //       username: { $first: "$username" },
  //       email: { $first: "$email" },
  //       description: { $first: "$description" },
  //       avatar: { $first: "$avatar" },
  //       coverImage: { $first: "$coverImage" },
  //       numberOfVideos: { $first: "$numberOfVideos" },
  //       recentVideos: { $first: "$recentVideos" },
  //       mostViewedVideos: { $push: "$allVideos" },
  //     },
  //   },
  //   {
  //     $addFields: {
  //       mostViewedVideos: { $slice: ["$mostViewedVideos", 4] },
  //     },
  //   },
  //   {
  //     $lookup: {
  //       from: "subscriptions",
  //       localField: "_id",
  //       foreignField: "subscribeTo",
  //       as: "subscribers",
  //     },
  //   },
  //   {
  //     $lookup: {
  //       from: "subscriptions",
  //       localField: "_id",
  //       foreignField: "subscriber",
  //       as: "subscribing",
  //     },
  //   },
  //   {
  //     $addFields: {
  //       subscribers: { $size: "$subscribers" },
  //       subscribing: { $size: "$subscribing" },
  //       isSubscribed: {
  //         $cond: {
  //           if: { $in: [user._id, "$subscribers.subscriber"] },
  //           then: true,
  //           else: false,
  //         },
  //       },
  //     },
  //   },
  // ]);

  let channel = await User.aggregate([
    {
      $match : {
        username : username,
      }
    },
    {
      $lookup : {
        from : "videos",
        localField : "username",
        foreignField : "username",
        as : "usernameVideos",
      }
    },
    {
      $addFields : {
        numberOfVideos : {$size : "$usernameVideos"},
      }
    },
    {
      $unwind : "$usernameVideos",
    },
    {
      $sort : {
        "usernameVideos.createdAt" : -1
      }
    },
    {
      $group : {
        _id : "$username",
        email : {$first : "$email"}
      }
    }
  ]);

  console.log(channel);

  // if (channel.length > 0) {
  //   channel = channel[0];
  // } else {
  //   channel = "User hasn't posted anything yet";
  // }
  if(channel.lenght == 0){
    channel = "User hasn't posted anything yet";
  }

  return res
    .status(201)
    .json(new ApiResponse(201, { channel }, "user profile details"));
});

//clear
const getWatchHistory = asyncHandler(async (req, res) => {
  const user = req.user;

  if (!user) {
    throw new ApiError(401, "Invalid request");
  }

  const watchedVideos = await User.aggregate([
    {
      $match: {
        _id: user._id,
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "video",
      },
    },
    {
      $unwind: "$video",
    },
    {
      $project: {
        video: 1,
      },
    },
  ]);

  console.log(watchedVideos);

  res
    .status(201)
    .json(
      new ApiResponse(
        201,
        watchedVideos,
        "Watch History of a user fetched successfully"
      )
    );
});

export {
  registerUser,
  resendOTP,
  verifyOTP,
  loginUser,
  logoutUser,
  refreshAccessToken,
  updateAvatar,
  removeCoverImage,
  updateCoverImage,
  changePassword,
  userProfile,
  getWatchHistory,
};
