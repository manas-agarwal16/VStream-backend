import { Router } from "express";
const router = Router();

import { verifyJWT } from "../middlewares/auth.middleware.js";
import upload from "../middlewares/multer.middleware.js";
import {
  deleteSong,
  getSongs,
  likeSong,
  searchSongs,
  unlikeSong,
  uploadSong,
} from "../controllers/song.controller.js";

router
  .route("/upload-song")
  .post(verifyJWT, upload.fields([{ name: "song", maxCount: 1 }]), uploadSong);

router.route("/get-songs").get(getSongs);
router.route("/search").get(searchSongs);
router.route("/like-song").post(verifyJWT, likeSong);
router.route("/unlike-song").post(verifyJWT, unlikeSong);
router.route("/delete-song").delete(verifyJWT, deleteSong);

export default router;
