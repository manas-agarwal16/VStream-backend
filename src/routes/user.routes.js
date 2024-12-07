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
  getWatchHistory,
  getCurrentUser,
} from "../controllers/user.controller.js";

router.route("/register").post(
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  registerUser
);

router.route(`/get-current-user`).get(getCurrentUser);
router.route("/verify-otp").post(verifyOTP);
router.route("/resend-otp/:email").get(resendOTP);
router.route("/login").post(loginUser);
router.route("/logout").get(verifyJWT, logoutUser);
router.route("/refresh-access-token").get(refreshAccessToken);
router
  .route("/update-avatar")
  .patch(
    verifyJWT,
    upload.fields([{ name: "avatar", maxCount: 1 }]),
    updateAvatar
  );

router
  .route("/update-coverImage")
  .patch(
    verifyJWT,
    upload.fields([{ name: "coverImage", maxCount: 1 }]),
    updateCoverImage
  );

router.route("/remove-coverImage").delete(verifyJWT, removeCoverImage);

router.route("/change-password").patch(verifyJWT, changePassword);

router.route("/user-profile/:username").get(verifyJWT, userProfile);

router.route("/watch-history").get(verifyJWT, getWatchHistory);

export default router;
