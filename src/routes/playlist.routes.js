import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { addToPlaylist, createPlaylist } from "../controllers/playlist.controller.js";
const router = Router();

router.route("/create").post(verifyJWT,createPlaylist);
router.route("/add-to-playlist").post(verifyJWT,addToPlaylist);

export default router;