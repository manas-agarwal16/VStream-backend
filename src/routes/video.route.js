import { Router } from "express";

const router = Router();

import upload from "../middlewares/multer.middleware.js";
import {
  comment,
  deleteComment,
  getComments,
  getVideos,
  getVideosByTag,
  likeVideo,
  likedVideos,
  search,
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
router.route("/unlike-video").delete(verifyJWT, unlikeVideo);
router.route("/get-videos").get(getVideos);
router.route("/home").get(getVideos);
router.route("/search").get(search);
router.route("/comment").post(verifyJWT, comment);
router.route("/delete-comment").delete(verifyJWT,deleteComment);
router.route("/get-comments").get(getComments);
router.route("/liked-videos").get(verifyJWT, likedVideos);
router.route("/get-videos-by-tagName").get(getVideosByTag);


export default router;
