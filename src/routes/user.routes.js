import { Router } from "express";

import upload from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();
//these coded execute when user meets the endpoint /users and all endpoints mentioned here r  after /api/v1/users/ => /api/v1/users/.....

import {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  updateAvatar,
  updateCoverImage,
  removeCoverImage,
  changePassword,
  verifyOTP,
  resendOTP,
  userProfile,
  getWatchHistory
} from "../controllers/user.controller.js";

router.route("/register").post(
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  registerUser
);

router.route("/verify-otp").post(verifyOTP);
router.route("/resend-otp").get(resendOTP);
router.route("/login").post(loginUser);
router.route("/logout").get(verifyJWT, logoutUser);
router.route("/refresh-access-token").post(refreshAccessToken);
router
  .route("/update-avatar")
  .post(
    verifyJWT,
    upload.fields([{ name: "avatar", maxCount: 1 }]),
    updateAvatar
  );

router
  .route("/update-coverImage")
  .post(
    verifyJWT,
    upload.fields([{ name: "coverImage", maxCount: 1 }]),
    updateCoverImage
  );

router.route("/remove-coverImage").post(verifyJWT, removeCoverImage);

router.route("/change-password").post(verifyJWT, changePassword);

router.route("/user-profile/:username").get(verifyJWT , userProfile);

router.route("/watch-history").get(verifyJWT,getWatchHistory);

export default router;
