import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/users.model.js";
import jwt from "jsonwebtoken";
import { ApiResponse } from "../utils/ApiResponse.js";

// we can write _ in place of res of theres no use of res, although its not mondatory..
const verifyJWT = asyncHandler(async (req, res, next) => {
  console.log("custom verifyJWT");

  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    console.log("token : ", token);
    
    if (!token) {
      throw new ApiError(401,'Unauthorized Request')
      // return res
      //   .status(401)
      //   .json(new ApiResponse(401, "", "Unauthorized Request - No token"));
    }

    // Decode the token
    const decodedToken = await jwt.verify(token, process.env.ACCESS_TOKEN_KEY);
    if (!decodedToken) {
      return res
        .status(401)
        .json(new ApiResponse(401, "", "Error decoding access token"));
    }

    // Fetch user
    const user = await User.findOne({ _id: decodedToken._id }).select(
      "-password -refreshToken"
    );

    if (!user) {
      return res
        .status(401)
        .json(
          new ApiResponse(401, "", "Unauthorized Request - User not found")
        );
    }

    req.user = user; // Attach user to request
    next(); // Proceed to next middleware
  } catch (error) {
    console.log("error here : " , error);
    
    if (error.name === "TokenExpiredError") {
      return res
        .status(401)
        .json(new ApiResponse(401, "", "Token expired. Please log in again."));
    }
    // throw new ApiError(401,"Unauthorized Request");
    return res
      .status(401)
      .json(new ApiResponse(401, "", "Unauthorized Request"));
  }
});

export { verifyJWT };
