import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/users.model.js";
import jwt from "jsonwebtoken";

// we can write _ in place of res of theres no use of res, although its not mondatory..
const verifyJWT = asyncHandler(async (req, _, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      throw new ApiError(401, "Unauthorized request!!");
    }

    //collecting data from data by decoding it. .verify() function to decode token.
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_KEY);

    if (!decodedToken) {
      throw new ApiError(501, "error in decodeding token");
    }

    const user = await User.findOne({ _id: decodedToken._id }).select(
      "-password -refreshToken"
    );

    if (!user) {
      throw new ApiError(400, "Invalid Access Token");
    }

    req.user = user; //here we have created a custom middleware req.user so that we can access user'details using req.user.

    next(); //after this 'next' the next function in row will be called.
  } catch (error) {
    throw new ApiError(401, "invalid access token");
  }
});

export { verifyJWT };
