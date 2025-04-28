const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  vehicleNo: {
    type: String,
    required: true,
    trim: true,
  },
  notificationType: {
    type: String,
    required: true,
  },
  notificationMessage: {
    type: String,
    required: true,
  },
  notificationDateTime: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

const NotificationModel = mongoose.model('notifications', notificationSchema);

module.exports = NotificationModel;