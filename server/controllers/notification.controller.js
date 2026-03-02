import NotificationModel from "../models/notification.model.js";

export const getUnreadNotificationCountController = async (req, res) => {
  try {
    const count = await NotificationModel.countDocuments({
      recipient: req.userId,
      readAt: null,
    });

    return res.status(200).json({
      message: "Unread notification count fetched successfully",
      error: false,
      success: true,
      data: { count },
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Internal server error",
      error: true,
      success: false,
    });
  }
};

export const getNotificationsController = async (req, res) => {
  try {
    const limitRaw = Number(req.query?.limit);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 50) : 20;

    const notifications = await NotificationModel.find({ recipient: req.userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return res.status(200).json({
      message: "Notifications fetched successfully",
      error: false,
      success: true,
      data: notifications,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Internal server error",
      error: true,
      success: false,
    });
  }
};

export const markNotificationReadController = async (req, res) => {
  try {
    const { notificationId } = req.params;

    const updated = await NotificationModel.findOneAndUpdate(
      { _id: notificationId, recipient: req.userId, readAt: null },
      { readAt: new Date() },
      { new: true }
    ).lean();

    if (!updated) {
      return res.status(404).json({
        message: "Notification not found",
        error: true,
        success: false,
      });
    }

    return res.status(200).json({
      message: "Notification marked as read",
      error: false,
      success: true,
      data: updated,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Internal server error",
      error: true,
      success: false,
    });
  }
};

export const markAllNotificationsReadController = async (req, res) => {
  try {
    const result = await NotificationModel.updateMany(
      { recipient: req.userId, readAt: null },
      { readAt: new Date() }
    );

    return res.status(200).json({
      message: "All notifications marked as read",
      error: false,
      success: true,
      data: { modifiedCount: result.modifiedCount || 0 },
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Internal server error",
      error: true,
      success: false,
    });
  }
};
