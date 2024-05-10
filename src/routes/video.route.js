import { Router } from "express";

const router = Router();

import upload from "../middlewares/multer.middleware.js";
import {
  comment,
  getComments,
  getVideos,
  likeVideo,
  likedVideos,
  search,
  subscribe,
  subscriptionChannels,
  subscriptions,
  unSubscribe,
  unlikeVideo,
  uploadVideo,
  watchVideo,
} from "../controllers/video.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

router.route("/upload-video").post(
  verifyJWT,
  upload.fields([
    { name: "videoFile", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  uploadVideo
);

router.route("/watch-video").get(verifyJWT, watchVideo);
router.route("/like-video").post(verifyJWT, likeVideo);
router.route("/unlike-video").post(verifyJWT, unlikeVideo);
router.route("/get-videos").get(getVideos);
router.route("/home").get(getVideos);
router.route("/search").get(search);
router.route("/comment").post(verifyJWT, comment);
router.route("/get-comments").get(getComments);
router.route("/liked-videos").get(verifyJWT, likedVideos);
router.route("/subscribe").post(verifyJWT, subscribe);
router.route("/unsubscribe").post(verifyJWT,unSubscribe);
//unsubscribe is left
router.route("/subscriptions-videos").get(verifyJWT, subscriptions);
router.route("/subscription-channels").get(verifyJWT,subscriptionChannels);

export default router;
