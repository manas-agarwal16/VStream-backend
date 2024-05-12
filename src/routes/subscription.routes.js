import { Router } from "express";

const router = Router();

import {
  subscribe,
  subscriptionChannels,
  subscriptions,
  unSubscribe,
} from "../controllers/subscription.controller.js";

import { verifyJWT } from "../middlewares/auth.middleware.js";

router.route("/subscribe").post(verifyJWT, subscribe);
router.route("/unsubscribe").delete(verifyJWT, unSubscribe);
router.route("/subscriptions-videos").get(verifyJWT, subscriptions);
router.route("/subscription-channels").get(verifyJWT, subscriptionChannels);

export default router;
