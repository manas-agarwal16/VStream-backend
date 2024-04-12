import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js"; // User has all access to DB.
import { uploadOncloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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
  console.log(`email: ${email}`);

  //validation
  if (fullName === "" || username === "" || email === "" || password === "") {
    throw new ApiError(400, "All fields are required");
  }

  //already exists
  let existedUser = User.find({ email });
  if (existedUser) {
    throw new ApiError(409, "email already exists");
  }
  existedUser = User.find({ username });
  if (existedUser) {
    throw new ApiError(409, "username already exists");
  }

  //file upload.
  console.log(req.files);
  const avatarLocalfilePath = req.files?.avatar[0]?.path; // ? to check for if exists.
  const coverImageLocalFilePath = req.files?.coverImage[0]?.path;

  //validation
  if (!avatarLocalfilePath) {
    //avatar is required , coverIamge is optional.
    throw new ApiError(400, "avatar is required");
  }

  //uplaod on cloudinary
  const cloudinaryAvatarURL = await uploadOncloudinary(avatarLocalfilePath);
  const cloudinaryCoverImageURL = await uploadOncloudinary(
    coverImageLocalFilePath
  );

  //error in uploading to cloudinary
  if (!cloudinaryAvatarURL) {
    throw new ApiError(500, "avatar not saved try again");
  }

  //registering into the db
  const user = await User.create({
    //User.create is to enter the entries into the db and is returns all the entered entries in object form
    username: username.toLowerCase(),
    fullName,
    email,
    avatar: cloudinaryAvatarURL.url,
    coverImage: cloudinaryCoverImageURL?.url || "",
    password,
  });

  //removing password and refresh token to not sending it to frontend by using select method. find methods return whole object.
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  //checking if saved into db
  if (!createdUser) {
    throw new ApiError(500, "error is registering the user");
  }

  //return res
  return res.status(201).json(
    new ApiResponse(200, createdUser , "User registered successfully!")
  )
});

export { registerUser };
