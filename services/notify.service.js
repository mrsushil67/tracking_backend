const app = require("../app");
const VehiclePathModel = require("../models/vehiclePath.model");
const AllVehiclesModel = require("../models/vehicles.model");
const NotificationModel = require("../models/notification.model");
const moment = require("moment");
const { io } = require("../server");

const sendNotification = async (req, res) => {
  if (global.socket) {
    global.socket.emit("message", "Hello from server");
    console.log("Socket connected");

  } else {
    console.log("Socket not connected");
  }
  const notificationType1 = "Vehicle Stopped";
  const notificationType2 = "Over Speed";

  try {
    const vehicles = await AllVehiclesModel.find({}, "vehicleNo");
    if (!vehicles || vehicles.length === 0) {
      return res.status(404).json({ message: "No vehicles found" });
    }
    const fifteenMinAgo = moment().subtract(15, "minutes");
    const fifteenMinutesAgo = new Date(fifteenMinAgo);

    const fiveMinAgo = moment().subtract(5, "minutes");
    const fiveMinutesAgo = new Date(fiveMinAgo);

    const oneMinuteAgo = moment().subtract(1, "minutes");
    const oneMinute = new Date(oneMinuteAgo);

    for (const vehicle of vehicles) {
      const existingNotification = await NotificationModel.findOne({
        vehicleNo: vehicle.vehicleNo,
        notificationType: notificationType1,
        createdAt: { $gte: fifteenMinutesAgo },
      });

      if (existingNotification) {
        continue;
      }

      const vehiclePaths = await VehiclePathModel.find({
        vehicleNo: vehicle.vehicleNo,
        createdAt: { $gte: fifteenMinutesAgo },
      });

      const rawData = await VehiclePathModel.find({
        vehicleNo: vehicle.vehicleNo,
        createdAt: { $gte: oneMinute },
      }).limit(2);

      // vehicle run 60+ spped with in 1 minutes
      const overSpeedRunningVehicle = rawData.filter(
        (item) => parseFloat(item.speed) > 62
      );

      const lastOverSpeedNotification = await NotificationModel.findOne({
        vehicleNo: vehicle.vehicleNo,
        notificationType: notificationType2,
        createdAt: { $gte: fiveMinutesAgo },
      });

      if (overSpeedRunningVehicle.length > 0) {
        if (!lastOverSpeedNotification) {
          const notification = new NotificationModel({
            vehicleNo: vehicle.vehicleNo,
            notificationType: notificationType2,
            notificationMessage: `Vehicle ${vehicle.vehicleNo} is running over speed.`,
            isRead: false,
            notificationDateTime: new Date(),
          });

          await notification.save();

          global.socket.emit("notification", {
            vehicleNo: vehicle.vehicleNo,
            notificationType: notificationType2,
            notificationMessage: `Vehicle ${vehicle.vehicleNo} is running over speed.`,
            isRead: false,
            notificationDateTime: new Date(),
          });
        }
      }
      const isSpeedZero = vehiclePaths.every((path) => path.speed === "0");
      if (isSpeedZero === true) {
        if (!existingNotification) {
          const notification = new NotificationModel({
            vehicleNo: vehicle.vehicleNo,
            notificationType: notificationType1,
            notificationMessage: `Vehicle ${vehicle.vehicleNo} has been stopped since last 15 minutes.`,
            isRead: false,
            notificationDateTime: new Date(),
          });

          await notification.save();
          global.socket.emit("notification", {
            vehicleNo: vehicle.vehicleNo,
            notificationType: notificationType1,
            notificationMessage: `Vehicle ${vehicle.vehicleNo} has been stopped since last 15 minutes.`,
            isRead: false,
            notificationDateTime: new Date(),
          });
        }
      }
    }
  } catch (error) {
    console.error("Error processing notifications:", error);
  }
};

const updateNotificationReadStatus = async () => {
  const notifications = await NotificationModel.find({ isRead: false });

  if (!notifications || notifications.length === 0) {
    return { message: "No unread notifications found" };
  }

  const unreadNotifications = notifications.filter(
    (notification) => !notification.isRead
  );

  if (unreadNotifications.length === 0) {
    return { message: "All notifications are already marked as read" };
  }
  if (!notifications || notifications.length === 0) {
    return { message: "No unread notifications found" };
  }
  const updatedNotifications = await NotificationModel.updateMany(
    { isRead: false },
    { isRead: true }
  );
  return updatedNotifications;
};

const fetchUnreadNotifications = async () => {
  const notifications = await NotificationModel.find({ isRead: false }).sort({
    createdAt: -1,
  });
  return notifications;
};

// const getNotificationById = async (req, res) => {
//   try {
//     const { notificationId } = req.params;

//     // Validate the request parameters
//     if (!notificationId) {
//       return res.status(400).json({ message: "Notification ID is required" });
//     }

//     // Fetch the notification by ID
//     const notification = await NotificationModel.findById(notificationId);

//     if (!notification) {
//       return res.status(404).json({ message: "Notification not found" });
//     }

//     return res.status(200).json(notification);
//   } catch (error) {
//     console.error("Error fetching notification:", error);
//     return res.status(500).json({ message: "Internal server error" });
//   }
// }

// const getNotifications = async (req, res) => {
//   try {
//     const { vehicleNo } = req.params;

//     // Validate the request parameters
//     if (!vehicleNo) {
//       return res.status(400).json({ message: "Vehicle number is required" });
//     }

//     // Fetch notifications for the specified vehicle
//     const notifications = await NotificationModel.find({ vehicleNo });

//     return res.status(200).json(notifications);
//   } catch (error) {
//     console.error("Error fetching notifications:", error);
//     return res.status(500).json({ message: "Internal server error" });
//   }
// }
// const deleteNotification = async (req, res) => {
//   try {
//     const { notificationId } = req.params;

//     // Validate the request parameters
//     if (!notificationId) {
//       return res.status(400).json({ message: "Notification ID is required" });
//     }

//     // Delete the notification
//     await NotificationModel.findByIdAndDelete(notificationId);

//     return res.status(200).json({ message: "Notification deleted successfully" });
//   } catch (error) {
//     console.error("Error deleting notification:", error);
//     return res.status(500).json({ message: "Internal server error" });
//   }
// }
// const deleteAllNotifications = async (req, res) => {
//   try {
//     // Delete all notifications
//     await NotificationModel.deleteMany();

//     return res.status(200).json({ message: "All notifications deleted successfully" });
//   } catch (error) {
//     console.error("Error deleting notifications:", error);
//     return res.status(500).json({ message: "Internal server error" });
//   }
// }

module.exports = {
  sendNotification,
  fetchUnreadNotifications,
  updateNotificationReadStatus,
};
