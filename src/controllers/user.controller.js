import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/users.model.js"; // User has all access to DB.
import {
  uploadOncloudinary,
  deleteFileFromCloudinary,
} from "../utils/cloudinary.js";

import { Video } from "../models/videos.model.js";
import bcrypt from "bcrypt";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import { generateOTP, sendOTPThroughEmail } from "../utils/otp_generator.js";
import { OtpModel } from "../models/Otp.model.js";
import { client } from "../utils/paypal.js";
import generatePaypalAccessToken from "../utils/paypalAccessToken.js";
import axios from "axios";

const getCurrentUser = asyncHandler(async (req, res) => {
  // console.log("getCurrentuseer");

  // console.log("token in cookies : ", req.cookies?.accessToken);
  let user;
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    // console.log("token : ", token);

    if (!token) {
      return res
        .status(401)
        .json(
          new ApiResponse(
            401,
            { loginStatus: false, userData: {} },
            "Unauthorized request!!"
          )
        );
    }

    //collecting data from data by decoding it. .verify() function to decode token.
    const decodedToken = await jwt.verify(token, process.env.ACCESS_TOKEN_KEY);

    // console.log("decodeToken : ", decodedToken);

    if (!decodedToken) {
      // throw new ApiError(501, "error in decodeding token");
      return res
        .status(501)
        .json(new ApiResponse(501, "", "error in decoding token"));
    }

    user = await User.findOne({ email: decodedToken.email }).select(
      "-password -refreshToken"
    );

    if (!user) {
      return res
        .status(401)
        .json(
          new ApiResponse(
            401,
            { loginStatus: false, userData: {} },
            "Unauthorized request!!"
          )
        );
    }

    // console.log("user : ", user);

    // console.log("user : " , user);

    res
      .status(201)
      .json(
        new ApiResponse(
          201,
          { loginStatus: true, userData: user },
          "Current user details fetched successfully"
        )
      );
  } catch (error) {
    console.log("error : ", error);

    // throw new ApiError(401, "invalid access token", error);
    return res
      .status(401)
      .json(
        new ApiResponse(
          401,
          { loginStatus: false, userData: {} },
          "invalid access token"
        )
      );
  }
});

//clear
const registerUser = asyncHandler(async (req, res) => {
  let { username, email, fullName, password, avatarURL } = req.body;

  console.log(username, " ", email, " ", fullName, " ", password);

  if (!fullName || !username || !email || !password) {
    return res
      .status(400)
      .json(new ApiResponse(400, "", "All fields are required"));
  }

  email = email.toLowerCase().trim();
  username = username.toLowerCase().trim();
  fullName = fullName
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

  let existedUser = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (existedUser) {
    if (existedUser.email === email) {
      return res
        .status(401)
        .json(new ApiResponse(401, "", "Email already exists"));
    }
    if (existedUser.username === username) {
      return res
        .status(409)
        .json(new ApiResponse(409, "", "Username already exists"));
    }
  }

  existedUser = await OtpModel.findOne({ email });
  if (existedUser) {
    return res
      .status(409)
      .json(new ApiResponse(409, "", "Email already exists"));
  }
  existedUser = await OtpModel.findOne({ username });
  if (existedUser) {
    return res
      .status(409)
      .json(new ApiResponse(409, "", "Username already exists"));
  }

  // console.log("req.files : ", req.files);
  // // File upload.
  // let avatarLocalPath;
  // if (req.files && req.files.avatar && req.files.avatar[0]) {
  //   avatarLocalPath = req.files.avatar[0].path;
  //   console.log("avatarLocalPath  : ", avatarLocalPath);
  // }

  // let cloudinaryAvatarURL;

  // if (avatarLocalPath) {
  //   cloudinaryAvatarURL = await uploadOncloudinary(avatarLocalPath);

  //   if (!cloudinaryAvatarURL) {
  //     return res
  //       .status(501)
  //       .json(new ApiResponse(501, "", "Avatar not saved, try again"));
  //   }
  // }

  // console.log("cloudinaryAvatarURL : ", cloudinaryAvatarURL);

  const OTP = generateOTP();

  const pendingUser = new OtpModel({
    username,
    fullName,
    email,
    // avatar: cloudinaryAvatarURL?.url,
    avatar: avatarURL,
    password,
    OTP,
  });

  await pendingUser
    .save()
    .then(() => {
      console.log("User saved to database successfully");
    })
    .catch((err) => {
      return res
        .status(501)
        .json(new ApiResponse(501, "", "Error in saving user to database"));
    });

  await sendOTPThroughEmail(email, OTP)
    .then(() => {
      res
        .status(201)
        .json(
          new ApiResponse(
            201,
            "",
            `An OTP has been sent to ${email} for verification`
          )
        );
    })
    .catch((error) => {
      console.error("Error sending OTP through email:", error);
      return res
        .status(501)
        .json(new ApiResponse(501, "", "Error sending OTP. Please try again!"));
    });
});

//clear
const resendOTP = asyncHandler(async (req, res) => {
  const { email } = req.params;
  console.log("email : ", email);

  const OTP = generateOTP();

  const user = await OtpModel.findOne({ email });

  if (!user) {
    return res
      .status(409)
      .json(
        new ApiResponse(
          409,
          "",
          "Email not found or expired. Try Registering again"
        )
      );
  }
  const updateOTP = await OtpModel.findOneAndUpdate(
    { email: email },
    { OTP: OTP }
  );
  if (!updateOTP) {
    return res
      .status(401)
      .json(
        new ApiResponse(
          401,
          "",
          "Email not found or expired. Try Registering again"
        )
      );
  }

  await sendOTPThroughEmail(email, OTP)
    .then(() => {
      res
        .status(201)
        .json(
          new ApiResponse(
            201,
            "",
            "An OTP has been sent to your email for verification"
          )
        );
    })
    .catch((err) => {
      return res
        .status(401)
        .json(new ApiResponse(401, "", "Error in sending email"));
    });
});

//clear
const verifyOTP = asyncHandler(async (req, res) => {
  let { OTP, email } = req.body;
  if (!OTP || !email) {
    return res
      .status(401)
      .json(new ApiResponse(401, "", "OTP and email required"));
  }

  OTP = Number(OTP);

  let dbOTP = await OtpModel.findOne({ email: email });

  if (!dbOTP) {
    return res
      .status(201)
      .json(new ApiResponse(201, "", "OTP has expired. Please register again"));
  }

  dbOTP = dbOTP.OTP;

  if (dbOTP !== OTP) {
    return res
      .status(401)
      .json(new ApiResponse(401, { success: false }, "Invalid OTP"));
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

  const deleteUserFromOtpModel = await OtpModel.findOneAndDelete({
    email: email,
  });

  if (!deleteFileFromCloudinary) {
    return res
      .status(501)
      .json(new ApiResponse(501, "", "Error in deleting user from OTP model"));
  }
  await user
    .save()
    .then(() => {
      res.status(201).json(
        new ApiResponse(
          201,
          {
            success: true,
            email: verifiedUser.email,
            password: verifiedUser.password,
          },
          "User registered successfully"
        )
      );
    })
    .catch((err) => {
      console.log(user);
      return res
        .status(501)
        .json(new ApiResponse(501, "", "Error in registering the user"));
    });
});

//clear
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // console.log(email, " ", password);

  // console.log("login");

  if (!email || !password) {
    return res
      .status(400)
      .json(new ApiResponse(400, "", "All fields are required."));
  }

  let user = await User.findOne({
    $or: [{ username: email }, { email: email }], //find on the basis of username or email.
  });

  if (!user) {
    return res
      .status(400)
      .json(
        new ApiResponse(400, "", "Username or email is not registered yet")
      );
  }

  const validPassword = await user.isCorrectPassword(password);
  if (!validPassword) {
    return res
      .status(400)
      .json(new ApiResponse(400, "", "Wrong password! Try again"));
  }

  const accessToken = await user.generateAccessToken();
  const refreshToken = await user.generateRefreshToken();

  if (!accessToken) {
    return res
      .status(500)
      .json(new ApiResponse(500, "", "Error in creating access token"));
  }
  if (!refreshToken) {
    return res
      .status(500)
      .json(new ApiResponse(500, "", "Error in creating refresh token"));
  }

  const setRefreshToken = await User.findOneAndUpdate(
    {
      $or: [{ username: email }, { email: email }], //find on the basis of username or email.
    },
    { refreshToken: refreshToken }
  );

  if (!setRefreshToken) {
    return res
      .status(501)
      .json(new ApiResponse(501, "", "Error in updating refresh token"));
  }

  // const options = {
  //   sameSite: "None",
  //   httpOnly: true, // only server can access cookie not client side.
  //   secure: true, // cookie is set over secure and encrypted connections.
  // };

  return res
    .status(200)
    .cookie("accessToken", accessToken, {
      sameSite: "None",
      httpOnly: true, // only server can access cookie not client side.
      secure: true,
      maxAge: 60 * 24 * 60 * 1000, //1d
    })
    .cookie("refreshToken", refreshToken, {
      sameSite: "None",
      httpOnly: true, // only server can access cookie not client side.
      secure: true,
      maxAge: 60 * 24 * 60 * 1000 * 60,
    })
    .json(new ApiResponse(201, user, "User has logged in successfully"));
});

//clear
const logoutUser = asyncHandler(async (req, res) => {
  console.log("logout");
  const { _id } = req.user;

  const updateRefreshToken = await User.findByIdAndUpdate(
    { _id: _id },
    { refreshToken: undefined },
    {
      new: true,
    }
  );

  if (!updateRefreshToken) {
    return res
      .status(501)
      .json(new ApiResponse(501, "", "Error in updating refresh token"));
  }

  const options = {
    httpOnly: true,
    secure: true,
    sameSite: "None",
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
    return res
      .status(401)
      .json(new ApiResponse(401, "", "Enter your passwords"));
  }
  const user = req.user;

  let userWithPassword = await User.findById({ _id: user._id });

  const correctPassword = await userWithPassword.isCorrectPassword(oldPassword);

  if (!correctPassword) {
    return res.status(401).json(new ApiResponse(401, "", "Wrong old password"));
  }

  const newHashPassword = await bcrypt.hash(newPassword, 10);

  if (!newHashPassword) {
    return res
      .status(501)
      .json(new ApiResponse(501, "", "Error in hashing password"));
  }

  const updatePassword = await User.findByIdAndUpdate(
    { _id: user._id },
    { password: newHashPassword }
  );
  if (!updatePassword) {
    return res
      .status(501)
      .json(new ApiResponse(501, "", "Error in updating password"));
  }

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { username: user.username },
        "Your password has been changed successfully!!"
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
    return res
      .status(401)
      .json(new ApiResponse(401, "", "Avatar is required!!!"));
  }

  const newAvatar = await uploadOncloudinary(avatarLocalPath);

  if (!newAvatar) {
    return res
      .status(501)
      .json(
        new ApiResponse(501, "", "Error in uploading new avatar to Cloudinary.")
      );
  }
  const user = req.user;

  // Deleting old avatar from Cloudinary
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
    return res
      .status(501)
      .json(
        new ApiResponse(
          501,
          "",
          "Error in deleting old avatar from Cloudinary!!"
        )
      );
  }

  const updateAvatar = await User.findByIdAndUpdate(
    { _id: user._id },
    { avatar: newAvatar.url }
  );

  if (!updateAvatar) {
    return res
      .status(501)
      .json(new ApiResponse(501, "", "Error in updating avatar"));
  }

  return res
    .status(201)
    .json(new ApiResponse(201, user, "Avatar has been updated successfully."));
});

//clear
const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    return res
      .status(401)
      .json(new ApiResponse(401, "", "refresh token expired"));
  }

  let decodedIncomingRefreshToken;
  try {
    decodedIncomingRefreshToken = await jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_KEY
    );
  } catch (error) {
    console.log("refresh token expired : ", error);
    return res
      .status(401)
      .json(new ApiResponse(401, "", "refresh token has expired!!!"));
  }

  if (!decodedIncomingRefreshToken) {
    return res
      .status(501)
      .json(new ApiResponse(501, "", "Error in decoding refresh token"));
  }

  const user = await User.findOne({ _id: decodedIncomingRefreshToken._id });

  if (!user) {
    return res
      .status(401)
      .json(new ApiResponse(401, "", "Invalid refreshToken"));
  }

  const dbRefreshToken = user.refreshToken;

  if (!dbRefreshToken) {
    return res
      .status(401)
      .json(new ApiResponse(401, "", "User has logged out already!!!"));
  }

  if (dbRefreshToken !== incomingRefreshToken) {
    return res
      .status(401)
      .json(new ApiResponse(401, "", "Invalid refreshToken"));
  }

  const newAccessToken = await user.generateAccessToken();
  if (!newAccessToken) {
    return res
      .status(501)
      .json(new ApiResponse(501, "", "Error in generating accessToken"));
  }

  // const saveRefreshToken = await User.findByIdAndUpdate(
  //   { _id: user._id },
  //   { refreshToken: newRefreshToken },
  //   { new: true }
  // );

  // if (!saveRefreshToken) {
  //   return res
  //     .status(501)
  //     .json(new ApiResponse(501, "", "Error in saving new refresh token"));
  // }

  const options = {
    httpOnly: true,
    secure: true,
    sameSite: "None",
  };

  return (
    res
      .status(201)
      .cookie("accessToken", newAccessToken, {
        httpOnly: true,
        secure: true,
        sameSite: "None",
        maxAge: 60 * 24 * 60 * 1000, //1d
      }) // AccessToken cookie's value will get replaced by newAccessToken.
      // .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          201,
          {
            accessToken: newAccessToken,
            // refreshToken: newRefreshToken,
            username: user.username,
          },
          "AccessToken is refreshed successfully!!!"
        )
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
  // console.log("username : ", username);

  const user = req.user;

  username = username.toLowerCase().trim();
  if (!username) {
    throw new ApiError(401, "username required");
  }

  const exists = await User.findOne({ username: username });
  if (!exists) {
    console.log("no such username exists");

    return res
      .status(401)
      .json(new ApiResponse(401, "", "no such username exists"));
  }

  //userDetails , userUploadedVideos , subscribers , subscribing
  let channel = await User.aggregate([
    {
      $match: {
        username: username,
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "_id",
        foreignField: "owner",
        as: "allVideos",
      },
    },
    {
      $addFields: {
        numberOfVideos: { $size: "$allVideos" },
      },
    },
    {
      $unwind: {
        path: "$allVideos",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $sort: { "allVideos.updatedAt": -1 },
    },
    {
      $group: {
        _id: "$_id",
        fullName: { $first: "$fullName" },
        username: { $first: "$username" },
        email: { $first: "$email" },
        description: { $first: "$description" },
        avatar: { $first: "$avatar" },
        allVideos: { $push: "$allVideos" },
        coverImage: { $first: "$coverImage" },
        numberOfVideos: { $first: "$numberOfVideos" },
        recentVideos: { $push: "$allVideos" },
      },
    },
    {
      $addFields: {
        recentVideos: { $slice: ["$recentVideos", 3] },
      },
    },
    {
      $unwind: {
        path: "$allVideos",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $sort: { "allVideos.views": -1 },
    },
    {
      $group: {
        _id: "$_id",
        fullName: { $first: "$fullName" },
        username: { $first: "$username" },
        email: { $first: "$email" },
        description: { $first: "$description" },
        avatar: { $first: "$avatar" },
        numberOfVideos: { $first: "$numberOfVideos" },
        recentVideos: { $first: "$recentVideos" },
        mostViewedVideos: { $push: "$allVideos" },
      },
    },
    {
      $addFields: {
        mostViewedVideos: { $slice: ["$mostViewedVideos", 3] },
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscribeTo",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribing",
      },
    },
    {
      $addFields: {
        isSubscribed: {
          $cond: {
            if: { $in: [user._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
        subscribers: { $size: "$subscribers" },
        subscribing: { $size: "$subscribing" },
      },
    },
  ]);

  if (channel.length > 0) {
    channel = channel[0];
  } else channel = {};

  // console.log("channel : ", JSON.stringify(channel, null, 2));

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
  const watchedVideos = await Promise.all(
    user.watchHistory.map(async (video_id) => {
      let video = await Video.findById(video_id);
      video = video.toObject();
      let avatar = await User.findById(video.owner);
      avatar = avatar.toObject();
      avatar = avatar.avatar;
      video = { ...video, avatar };
      return video;
    })
  );

  // console.log("watchedVideos : ", watchedVideos);

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

// import express from "express";
// import "dotenv/config";
import paypal from "@paypal/paypal-server-sdk";
import {
  OrdersController,
  PaymentsController,
} from "@paypal/paypal-server-sdk";

const ordersController = new OrdersController(client);
const paymentsController = new PaymentsController(client);

// /**
//  * Create an order to start the transaction.
//  * @see https://developer.paypal.com/docs/api/orders/v2/#orders_create
//  */
let paypalAccessToken;

const createOrderFunction = async (cart) => {
  paypalAccessToken = await generatePaypalAccessToken();

  console.log("paypalAccessToken : ", paypalAccessToken);

  const collect = {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${paypalAccessToken}`,
    },
    body: {
      intent: "CAPTURE",
      purchaseUnits: [
        {
          amount: {
            currencyCode: "USD",
            value: "100.00",
          },
        },
      ],
      purchase_units: [
        {
          amount: {
            currency_code: "USD",
            value: "100.00",
          },
        },
      ],
      // application_context: {
      //   return_url: "https://www.linkedin.com/in/manas-agarwal-995370275/", // Redirect URL after payment
      //   cancel_url: "https://www.linkedin.com/in/manas-agarwal-995370275/", // Redirect URL if payment is canceled
      // },
    },
    prefer: "return=minimal",
  };

  try {
    let { body, ...httpResponse } =
      await ordersController.ordersCreate(collect);

    body = JSON.parse(body);
    console.log("body type : ", typeof body);

    body = { ...body, paypalAccessToken: paypalAccessToken };

    return {
      jsonResponse: body,
      httpStatusCode: httpResponse.statusCode,
    };
  } catch (error) {
    // if (error instanceof ApiErrorPaypal) {
    // const { statusCode, headers } = error;
    console.log("paypal error is triggering : ", error);
    throw new Error(error.message);
    // }
  }
};

//   const PAYPAL_API = "https://api-m.sandbox.paypal.com/v2/checkout/orders";
//   const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
//   const PAYPAL_SECRET = process.env.PAYPAL_SECRET;

//   const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString(
//     "base64"
//   );

//   const orderData = {
//     intent: "CAPTURE",
//     purchase_units: [
//       {
//         amount: {
//           currency_code: "USD",
//           value: cart.toString(),
//         },
//       },
//     ],
//   };

//   try {
//     const response = await axios.post(PAYPAL_API, orderData, {
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: `Basic ${auth}`,
//       },
//     });

//     return {
//       jsonResponse: response.data,
//       httpStatusCode: response.status,
//     };
//   } catch (err) {
//     console.error("Error in createOrderFunction:", err.response?.data || err);
//     throw new Error("Failed to communicate with PayPal API.");
//   }
// };

// // createOrder route
// post("/api/orders", async (req, res) => {
//     try {
//         // use the cart information passed from the front-end to calculate the order amount detals
//         // const { cart } = req.body;
//         cart = undefined;
//         const { jsonResponse, httpStatusCode } = await createOrder(cart);
//         res.status(httpStatusCode).json(jsonResponse);
//     } catch (error) {
//         console.error("Failed to create order:", error);
//         res.status(500).json({ error: "Failed to create order." });
//     }
// });

//Need to change the url. abhi localhost dala hai.

const createOrder = async (req, res) => {
  paypalAccessToken = await generatePaypalAccessToken();
  const url = "https://api-m.sandbox.paypal.com/v2/checkout/orders";

  try {
    const response = await axios.post(
      url,
      {
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: "USD",
              value: "10.00",
            },
          },
        ],
        application_context: {
          return_url: "http://localhost:5173/premium/success", // Your return URL after successful payment
          cancel_url: "http://localhost:5173", // Your cancel URL in case of payment cancellation
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${paypalAccessToken}`,
        },
      }
    );

    console.log("Order Created:", response.data);
    return res.status(201).json(response.data);
  } catch (error) {
    console.error(
      "Error creating order:",
      error.response?.data || error.message
    );
    return res.status(501).json({ error: "Failed to create order." });
  }

  // try {
  //   const cart = 101;

  //   const { jsonResponse, httpStatusCode } = await createOrderFunction(cart);
  //   console.log("httpStatusCode : ", httpStatusCode);

  //   console.log("jsonResponse : ", jsonResponse);

  //   return res.status(httpStatusCode).json(jsonResponse);
  // } catch (error) {
  //   console.error("Failed to create order:", error);
  //   res.status(500).json({ error: "Failed to create order." });
  // }

  // try {
  //   // Make the API call to PayPal to create the order

  //   console.log(
  //     "Available methods in ordersController:",
  //     Object.keys(ordersController)
  //   );

  //   const { body, ...httpResponse } =
  //     await ordersController.createRequest(orderRequest);

  //   console.log("body : ", body);

  //   return res.status(httpResponse.statusCode).json(body);

  //   const request = new paypal.orders.OrdersCreateRequest();
  //   request.requestBody(orderRequest);

  //   const order = await client.execute(request);

  //   // Return the approval URL for the client to complete the payment
  //   const approvalUrl = order.result.links.find(
  //     (link) => link.rel === "approve"
  //   ).href;

  //   res.status(200).json({
  //     id: order.result.id, // Order ID
  //     approvalUrl: approvalUrl, // Approval URL
  //   });
  // } catch (error) {
  //   console.error("Error creating order:", error);
  //   res.status(500).json({
  //     message: "Error creating PayPal order",
  //     error: error.message,
  //   });
  // }
};

// const captureOrder = asyncHandler(async (req, res) => {
//   const { orderID , paypalAccessToken } = req.body; // Get the order ID from the frontend

//   console.log("in captureOrder : ", orderID ,  paypalAccessToken);

//   try {
//     // Create the capture order request
//     const request = new paypal.orders.OrdersCaptureRequest(orderID);
//     request.requestBody({});

//     // Execute the capture request
//     const capture = await client.execute(request);

//     // Check the result and respond accordingly
//     if (capture.statusCode === 200) {
//       res.status(200).json({
//         message: "Payment successful!",
//         captureDetails: capture.result,
//       });
//     } else {
//       res.status(400).json({
//         message: "Error capturing the payment.",
//         error: capture.result,
//       });
//     }
//   } catch (error) {
//     console.error("Error capturing order:", error);
//     res.status(500).json({
//       message: "Error processing PayPal payment",
//       error: error.message,
//     });
//   }
// });

const captureOrder = asyncHandler(async (req, res) => {
  const { orderID } = req.body;
  const url = `https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderID}/capture`;

  try {
    const response = await axios.post(
      url,
      {},
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${paypalAccessToken}`,
        },
      }
    );

    console.log("Capture Response:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "Error capturing payment:",
      error.response?.data || error.message
    );
  }
});

// /**
//  * Capture payment for the created order to complete the transaction.
//  * @see https://developer.paypal.com/docs/api/orders/v2/#orders_capture
//  */

// const captureOrder = async (orderID) => {
//     const collect = {
//         id: orderID,
//         prefer: "return=minimal",
//     };

//     try {
//         const { body, ...httpResponse } = await ordersController.ordersCapture(
//             collect
//         );
//         // Get more response info...
//         // const { statusCode, headers } = httpResponse;
//         return {
//             jsonResponse: JSON.parse(body),
//             httpStatusCode: httpResponse.statusCode,
//         };
//     } catch (error) {
//         if (error instanceof ApiError) {
//             // const { statusCode, headers } = error;
//             throw new Error(error.message);
//         }
//     }
// };

// // captureOrder route
// app.post("/api/orders/:orderID/capture", async (req, res) => {
//     try {
//         const { orderID } = req.params;
//         const { jsonResponse, httpStatusCode } = await captureOrder(orderID);
//         res.status(httpStatusCode).json(jsonResponse);
//     } catch (error) {
//         console.error("Failed to create order:", error);
//         res.status(500).json({ error: "Failed to capture order." });
//     }
// });

export {
  getCurrentUser,
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
  createOrder,
  captureOrder,
};
