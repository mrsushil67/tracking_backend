const app = require("../app");
const VehiclePathModel = require("../models/vehiclePath.model");
const AllVehiclesModel = require("../models/vehicles.model");
const NotificationModel = require("../models/notification.model");
const moment = require("moment");
const { io } = require("../server");

const sendNotification = async (req, res) => {

if(global.socket){
  global.socket.emit("message", "Hello from server");
  console.log("Socket connected:", global.socket.id);
}
else{
    console.log("Socket not connected");
}
  const notificationType = "Vehicle Stopped";
  try {
    const vehicles = await AllVehiclesModel.find({}, "vehicleNo");
    if (!vehicles || vehicles.length === 0) {
      return res.status(404).json({ message: "No vehicles found" });
    }
    const tenMinAgo = moment().subtract(10, "minutes");
    const tenMinutesAgo = new Date(tenMinAgo);

    for (const vehicle of vehicles) {
      const existingNotification = await NotificationModel.findOne({
        vehicleNo: vehicle.vehicleNo,
        notificationType: notificationType,
        createdAt: { $gte: tenMinutesAgo },
      });

      if (existingNotification) {
        continue;
      }

      const vehiclePaths = await VehiclePathModel.find({
        vehicleNo: vehicle.vehicleNo,
        createdAt: { $gte: tenMinutesAgo },
      });

      const isSpeedZero = vehiclePaths.every((path) => path.speed === "0");
      if (isSpeedZero === true) {
        const notification = new NotificationModel({
          vehicleNo: vehicle.vehicleNo,
          notificationType: notificationType,
          notificationMessage: `Vehicle ${vehicle.vehicleNo} has been stopped from last 10 minutes in ${vehicle.currentAddress}`,
          notificationDateTime: new Date(),
        });

        await notification.save();
        global.socket.emit("notification", {
          vehicleNo: vehicle.vehicleNo,
          notificationType: notificationType,
          notificationMessage: `Vehicle ${vehicle.vehicleNo} has been stopped from last 10 minutes in ${vehicle.currentAddress}`,
          notificationDateTime: new Date(),
        });
      }
    }
  } catch (error) {
    console.error("Error processing notifications:", error);
  }
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

// const getAllNotifications = async (req, res) => {
//   try {
//     // Fetch all notifications
//     const notifications = await NotificationModel.find();

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

module.exports = {sendNotification};
