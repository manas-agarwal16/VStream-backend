import { Router } from "express";

const router = Router();

import upload from "../middlewares/multer.middleware.js";
import {
  comment,
  deleteComment,
  deleteVideo,
  editComment,
  getComments,
  getVideos,
  likedVideos,
  myVideos,
  search,
  toggleCommentLike,
  toggleVideoLike,
  // updateThumbnail,
  updateVideoDetails,
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

router.route("/watch-video/:video_id").get(verifyJWT, watchVideo);
router.route("/toggle-video-like/:video_id").post(verifyJWT, toggleVideoLike);
router.route("/get-videos").get(getVideos);
router.route("/search").get(search);
router.route("/comment").post(verifyJWT, comment);
router.route('/edit-comment').patch(verifyJWT , editComment);
router.route("/toggle-comment-lke").post(verifyJWT , toggleCommentLike);
router.route("/delete-comment/:comment_id").delete(verifyJWT, deleteComment);
router.route("/get-comments").get(getComments);
router.route("/liked-videos").get(verifyJWT, likedVideos);
router.route("/my-videos").get(verifyJWT, myVideos);
router.route("/update-video-details").patch(verifyJWT,upload.fields([{name : "thumbnail" , maxCount : 1} , {name : "videoFile" , maxCount : 1}]), updateVideoDetails);
// router
//   .route("/update-thumbnail")
//   .patch(
//     verifyJWT,
//     upload.fields([{ name: "thumbnail", maxCount: 1 }]),
//     updateThumbnail
//   );
router.route("/delete-video").delete(verifyJWT, deleteVideo);


export default router;
