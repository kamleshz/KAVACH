import express from "express";
import { auth } from "../middleware/auth.js";
import {
  getNotificationsController,
  getUnreadNotificationCountController,
  markAllNotificationsReadController,
  markNotificationReadController,
} from "../controllers/notification.controller.js";

const router = express.Router();

router.get("/", auth, getNotificationsController);
router.get("/unread-count", auth, getUnreadNotificationCountController);
router.patch("/read-all", auth, markAllNotificationsReadController);
router.patch("/:notificationId/read", auth, markNotificationReadController);

export default router;
