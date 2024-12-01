import { Router } from "express";

const router = Router();

import {
  toggleSubscribe,
  subscriptionChannels,
  subscriptions,
} from "../controllers/subscription.controller.js";

import { verifyJWT } from "../middlewares/auth.middleware.js";

router.route("/toggle-subscribe").post(verifyJWT, toggleSubscribe);
router.route("/subscriptions-videos").get(verifyJWT, subscriptions);
router.route("/subscription-channels").get(verifyJWT, subscriptionChannels);

export default router;
