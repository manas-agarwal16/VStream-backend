import {Router} from "express";

const router = Router();

import upload from "../middlewares/multer.middleware.js";
import { uploadVideo } from "../controllers/video.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

router
  .route("/upload-video")
  .post(
    verifyJWT,
    upload.fields([{ name: "videoFile", maxCount: 1 }, {name : "thumbnail",maxCount : 1}]),
    uploadVideo
  );

export default router;
