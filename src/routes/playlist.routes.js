import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  addToPlaylist,
  createPlaylist,
  deletePlaylist,
  mergePlaylists,
  myPlaylists,
  removeFromPlaylist,
  viewPlaylist,
} from "../controllers/playlist.controller.js";
const router = Router();

router.route("/create").post(verifyJWT, createPlaylist);
router.route("/add-to-playlist").post(verifyJWT, addToPlaylist);
router.route("/remove-from-playlist").delete(verifyJWT, removeFromPlaylist);
router.route("/delete-playlist").delete(verifyJWT, deletePlaylist);
router.route("/my-playlists").get(verifyJWT, myPlaylists);
router.route("/view-playlist").get(verifyJWT,viewPlaylist);
router.route("/merge-playlists").post(verifyJWT,mergePlaylists);

export default router;
