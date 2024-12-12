import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/users.model.js";
import jwt from "jsonwebtoken";
import { ApiResponse } from "../utils/ApiResponse.js";

// we can write _ in place of res of theres no use of res, although its not mondatory..
const verifyJWT = asyncHandler(async (req, res, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      // throw new ApiError(401, "Unauthorized request!!");
      return res
        .status(401)
        .json(new ApiResponse(401, "", "Unauthorized Request"));
    }

    //collecting data from data by decoding it. .verify() function to decode token.
    const decodedToken = await jwt.verify(token, process.env.ACCESS_TOKEN_KEY);

    if (!decodedToken) {
      return res
        .status(401)
        .json(new ApiResponse(401, "", "Error in decoding access token"));
    }

    const user = await User.findOne({ _id: decodedToken._id }).select(
      "-password -refreshToken"
    );

    if (!user) {
      return res
        .status(401)
        .json(new ApiResponse(401, "", "Unauthorized Request"));
    }

    // console.log("userJWT : " , user);
    

    req.user = user; //here we have created a custom middleware req.user so that we can access user'details using req.user.

    next(); //after this 'next' the next function in row will be called.
  } catch (error) {
    return res
      .status(401)
      .json(new ApiResponse(401, "", "Unauthorized Request"));
  }
});

export { verifyJWT };
