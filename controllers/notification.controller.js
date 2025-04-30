const { fetchUnreadNotifications, updateNotificationReadStatus } = require("../services/notify.service");

const getUnreadNotifications = async (req, res) => {
  try {
    const notifications = await fetchUnreadNotifications();
    if (!notifications || notifications.length === 0) {
      return res.status(404).json({ message: "No notifications found" });
    }
    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ message: "Error fetching notifications", error });
  }
};

const updatedNotificationStatus = async (req, res) => {
  try {
    const notifications = await updateNotificationReadStatus();
    if (!notifications || notifications.length === 0) {
      return res.status(404).json({ message: "No notifications found" });
    }
    res.status(200).json({message: "All message marked as read", notifications});
  }catch (error) {
    res.status(500).json({ message: "Error updating notifications", error });
  }
}

module.exports = {
  getUnreadNotifications,
  updatedNotificationStatus,
};


// const sendNotification = async (req, res) => {
//   if (global.socket) {
//     global.socket.emit("message", "Hello from server");
//     console.log("Socket connected:", global.socket.id);
//   } else {
//     console.log("Socket not connected");
//   }
//   const notificationType1 = "Vehicle Stopped";
//   const notificationType2 = "Over Speed";
//   try {
//     const vehicles = await AllVehiclesModel.find({}, "vehicleNo");
//     if (!vehicles || vehicles.length === 0) {
//       return res.status(404).json({ message: "No vehicles found" });
//     }
//     const tenMinAgo = moment().subtract(10, "minutes");
//     const tenMinutesAgo = new Date(tenMinAgo);

//     const oneMinuteAgo = moment().subtract(1, "minutes");
//     const oneMinute = new Date(oneMinuteAgo);

//     for (const vehicle of vehicles) {
//       const existingNotification = await NotificationModel.findOne({
//         vehicleNo: vehicle.vehicleNo,
//         notificationType: notificationType1,
//         createdAt: { $gte: tenMinutesAgo },
//       });

//       if (existingNotification) {
//         continue;
//       }

//       const vehiclePaths = await VehiclePathModel.find({
//         vehicleNo: vehicle.vehicleNo,
//         createdAt: { $gte: tenMinutesAgo },
//       });

//       const rawData = await VehiclePathModel.find({
//         vehicleNo: vehicle.vehicleNo,
//         createdAt: { $gte: oneMinute },
//       });

//       const overSpeedRunningVehicle = rawData.filter(
//         (item) => parseFloat(item.speed) > 60
//       );

//       if (overSpeedRunningVehicle.length > 0) {
//         const notification = new NotificationModel({
//           vehicleNo: vehicle.vehicleNo,
//           notificationType: notificationType2,
//           notificationMessage: `Vehicle ${vehicle.vehicleNo} is running over speed.`,
//           isRead: false,
//           notificationDateTime: new Date(),
//         });

//         // console.log(notification)
//         await notification.save();
//         global.socket.emit("notification", {
//           vehicleNo: vehicle.vehicleNo,
//           notificationType: notificationType2,
//           notificationMessage: `Vehicle ${vehicle.vehicleNo} is running over speed.`,
//           isRead: false,
//           notificationDateTime: new Date(),
//         });
//       }

//       const isSpeedZero = vehiclePaths.every((path) => path.speed === "0");
//       if (isSpeedZero === true) {
//         const notification = new NotificationModel({
//           vehicleNo: vehicle.vehicleNo,
//           notificationType: notificationType1,
//           notificationMessage: `Vehicle ${vehicle.vehicleNo} has been stopped from last 10 minutes.`,
//           isRead: false,
//           notificationDateTime: new Date(),
//         });

//         await notification.save();
//         global.socket.emit("notification", {
//           vehicleNo: vehicle.vehicleNo,
//           notificationType: notificationType1,
//           notificationMessage: `Vehicle ${vehicle.vehicleNo} has been stopped from last 10 minutes.`,
//           isRead: false,
//           notificationDateTime: new Date(),
//         });
//       }
//     }
//   } catch (error) {
//     console.error("Error processing notifications:", error);
//   }
// };
