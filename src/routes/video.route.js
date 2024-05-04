import {Router} from "express";

const router = Router();

import upload from "../middlewares/multer.middleware.js";
import { likeVideo, unlikeVideo, uploadVideo, watchVideo } from "../controllers/video.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

router
  .route("/upload-video")
  .post(
    verifyJWT,
    upload.fields([{ name: "videoFile", maxCount: 1 }, {name : "thumbnail",maxCount : 1}]),
    uploadVideo
  );

router.route("/watch-video").get(verifyJWT,watchVideo);
router.route("/like-video").post(verifyJWT,likeVideo);
router.route("/unlike-video").post(verifyJWT,unlikeVideo);

export default router;
