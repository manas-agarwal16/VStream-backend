import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js"; // User has all access to DB.
import {
  uploadOncloudinary,
  deleteFileFromCloudinary,
} from "../utils/cloudinary.js";

import bcrypt from "bcrypt";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const registerUser = asyncHandler(async (req, res) => {
  // get user details from frontend
  // validation for empty fields and emails
  // check if already registered
  // check for images, and avatar,
  // upload on cloudinary, avatar and images
  // create object to save it to db, (mongodb response the full object that is saved in db)
  // remove password and refreshToken from response.
  // check user creation
  // return res.

  //user details
  const { username, email, fullName, password } = req.body;
  //validation
  if (fullName === "" || username === "" || email === "" || password === "") {
    throw new ApiError(400, "All fields are required");
  }

  //already exists
  let existedUser = await User.find({ email }); //returns length
  if (existedUser.length !== 0) {
    throw new ApiError(409, "email already exists");
  }
  existedUser = await User.find({ username });
  if (existedUser.length !== 0) {
    throw new ApiError(409, "username already exists");
  }

  //file upload.
  let coverImageLocalPath;
  if (req.files && req.files.coverImage && req.files.coverImage[0]) {
    coverImageLocalPath = req.files.coverImage[0].path;
  } // ? to check for if exists.
  let avatarLocalPath;
  if (req.files && req.files.avatar && req.files.avatar[0]) {
    avatarLocalPath = req.files.avatar[0].path;
  }
  //validation
  if (!avatarLocalPath) {
    //avatar is required , coverIamge is optional.
    throw new ApiError(400, "avatar is required");
  }

  //uplaod on cloudinary
  const cloudinaryAvatarURL = await uploadOncloudinary(avatarLocalPath);
  let cloudinaryCoverImageURL;
  if (coverImageLocalPath) {
    cloudinaryCoverImageURL = await uploadOncloudinary(coverImageLocalPath);
  }

  //error in uploading to cloudinary
  if (!cloudinaryAvatarURL) {
    throw new ApiError(500, "avatar not saved try again");
  }

  //registering into the db
  const user = new User({
    //User.create is to enter the entries into the db and is returns all the entered entries in object form
    username: username.toLowerCase(),
    fullName,
    email: email.toLowerCase(),
    avatar: cloudinaryAvatarURL.url,
    coverImage: cloudinaryCoverImageURL?.url || "",
    password,
  });
  try {
    await user.save();
  } catch (error) {
    throw new ApiError(
      501,
      "error in saving the user'details to the database!!"
    );
  }

  //removing password and refresh token to not sending it to frontend by using select method. find methods return whole object.
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  //checking if saved into db
  if (!createdUser) {
    throw new ApiError(500, "error is registering the user");
  }

  //return res
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully!"));
});

const loginUser = asyncHandler(async (req, res) => {
  // username or email and password from user.
  // validate if empty
  // check if correct
  // generate access and refresh Token

  const { username, email, password } = req.body;

  console.log(req.body);
  console.log(req.body.username, email, password);

  if ((!username && !email) || !password) {
    throw new ApiError(400, "All fields are required.");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }], //find on the basis of username or email.
  });

  console.log(user);

  if (!user) {
    throw new ApiError(400, "username or email is not registered yet");
  }

  const validPassword = await user.isCorrectPassword(password); // user references to the user's document
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

  user.refreshToken = refreshToken;
  user.save({ validateBeforeSave: false }); // if only not all fields are to be saved

  const options = {
    httpOnly: true, // only server can access cookie not client side.
    secure: true, // cookie is set over secure and encrypted connections.
  };

  return res
    .status(200)
    .cookie("AccessToken", accessToken, options) // Set/create a cookie named "AccessToken" with the provided value and options
    .cookie("RefreshToken", refreshToken, options) // Set a cookie named "RefreshToken" with the provided value and options
    .json(
      new ApiResponse(
        201,
        {
          username: username,
          avatar: user.avatar,
          accessToken: accessToken,
          refreshToken: refreshToken,
        },
        "user has logged in successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  const { _id } = req.user;

  const user = await User.findOne({ _id: _id });
  user.refreshToken = undefined;
  user.save({ validateBeforeSave: false });

  const options = {
    httpOnly: true,
    secure: true,
  };

  res
    .status(200)
    .clearCookie("AccessToken", options)
    .clearCookie("RefreshToken", options)
    .json(
      new ApiResponse(
        201,
        { username: req.user.username },
        `${req.user.username}user has logged out successfully`
      )
    );
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies?.RefreshToken || req.body.refreshToken;

  console.log(incomingRefreshToken);
  if (!incomingRefreshToken) {
    throw new ApiError(401, "unauthorized request");
  }
  //decoding incoming refresh token.
  const decodedIncomingRefreshToken = jwt.verify(
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
  if (incomingRefreshToken !== dbRefreshToken) {
    throw new ApiError(401, "unauthorized request");
  }
  const newAccessToken = await user.generateAccessToken();
  const newRefreshToken = await user.generateRefreshToken();

  console.log("newAcessToken: ", newAccessToken);
  if (!newAccessToken) {
    throw new ApiError(501, "error is generating accessToken");
  }
  if (!newRefreshToken) {
    throw new ApiError(501, "error in generating refresh token");
  }
  user.refreshToken = newRefreshToken;
  user.save({ validateBeforeSave: false });
  const options = {
    httpOnly: true,
    secure: true,
  };
  res
    .status(201)
    .cookie("AccessToken", newAccessToken, options) //AccessToken cookie's value will get replaced by newAccessToken.
    .cookie("RefreshToken", newRefreshToken, options)
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

const changeCurrentUserPassword = asyncHandler(async (req, res) => {
  let { oldPassword, newPassword } = req.body;
  console.log(req.body);
  if (!newPassword || !oldPassword) {
    throw new ApiError(401, "enter your passwords");
  }

  const user = req.user;
  console.log(user);

  let currentUserPassword = await User.findOne({ _id: user._id });
  currentUserPassword = currentUserPassword.password;
  console.log(currentUserPassword);

  const validOldPassword = await bcrypt.compare(
    oldPassword,
    currentUserPassword
  );
  console.log(validOldPassword);

  if (!validOldPassword) {
    throw new ApiError(401, "wrong old password");
  }
  const newHashPassword = await bcrypt.hash(newPassword, 10);

  if (!newHashPassword) {
    throw new ApiError(501, "error in hashing password");
  }
  user.password = newHashPassword;
  await user.save({ validateBeforeSave: false });

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

//website doesn't allow to change username.
const updateUserDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;

  if (!fullName || !email) {
    throw new ApiError(401, "all fields are required");
  }

  const user = req.user;

  if (!user) {
    throw new ApiError(401, "unauthorized request");
  }

  user.fullName = fullName;
  user.email = email;
  user.save({ validateBeforeSave: false });

  return res
    .status(210)
    .json(
      new ApiResponse(
        201,
        { fullName, email },
        "details have been updatedd successfully!!"
      )
    );
});

const updateAvatar = asyncHandler(async (req, res) => {
  let avatarLocalPath;

  if (req.files && req.files.avatar && req.files.avatar[0]) {
    avatarLocalPath = req.files.avatar[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(401, "avatar is required!!!");
  }

  const newAvatar = await uploadOncloudinary(avatarLocalPath);

  console.log("newAvatar:", newAvatar);
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

  user.avatar = newAvatar.url;
  user.save({ validateBeforeSave: false });

  return res
    .status(201)
    .json(new ApiResponse(201, user, "avatar has been updated successfully."));
});

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
    console.log(oldAvatarPublic_id);

    const deletionResult = await deleteFileFromCloudinary(oldAvatarPublic_id);

    if (!deletionResult) {
      throw new ApiResponse(
        501,
        "error in deleting old coverImage from cloudinary!!"
      );
    }
  }
  user.coverImage = "";
  user.save({ validateBeforeSave: false });
  res
    .status(201)
    .json(new ApiResponse(201, "coverImage has been removed succesfully!"));
});

const updateCoverImage = asyncHandler(async (req, res) => {
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
  const newCoverImage = await uploadOncloudinary(coverImageLocalPath);

  if (!newCoverImage) {
    throw new ApiError(501, "error in uploading coverImage to cloudinary!");
  }
  const user = req.user;

  const oldCoverImage = user.coverImage;

  if (oldCoverImage) {
    let oldCoverImagePublic_id = oldCoverImage.replace(
      "http://res.cloudinary.com/dgrm75hbj/image/upload/",
      ""
    );

    const array = oldCoverImagePublic_id.split("/"); //string to array based on "/";

    oldCoverImagePublic_id = array[1].replace(".png", "");
    console.log(oldAvatarPublic_id);

    const deletionResult = await deleteFileFromCloudinary(oldAvatarPublic_id);

    if (!deletionResult) {
      throw new ApiResponse(
        501,
        "error in deleting old coverImage from cloudinary!!"
      );
    }
  }

  user.coverImage = newCoverImage.url;
  user.save({ validateBeforeSave: false });

  res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { coverImage: user.coverImage },
        "coverimage have been updated successfully"
      )
    );
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;
  if (!username) {
    throw new ApiError(401, "username does not exists");
  }

  const channel = User.aggregate([
    {
      $match: {
        username: username.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id", //_id is the id of the document passed by $match.
        foreignField: "channel", //documents where channel = _id
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscribers",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscriberCount: {
          $size: "$subscribers", //$ sign is used if it is a field in the output of aggregation
        },
        subscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },// $in checks (can in both inside array and object) if req.user._id is a value in subscriber.
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        subscriberCount: 1,
        isSubscribed: 1,
        subscribedToCount: 1,
        avatar: 1,
        coverImage: 1,
        username: 1,
        email: 1,
        createdAt: 1,
        fullName: 1,
      },
    },
  ]);

  console.log(`profile : ${channel}`);
  return res
    .send(201)
    .json(new ApiResponse(201, { channel: channel }, "user profile details"));
});

const getWatchHistory = asyncHandler(async (req,res) => {
  const watchHistory = await User.aggregate([
    {
      $match : {
        _id : new mongoose.Types.ObjectId(req.user?._id)
      }
    },
    {
      $lookup : {
        from : "videos",
        localField : "watchHistory",
        foreignField : "_id",
        as : "watchHistory",
      }
    }
  ])
})

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  updateUserDetails,
  updateAvatar,
  updateCoverImage,
  removeCoverImage,
  changeCurrentUserPassword,
  getUserChannelProfile,
};
