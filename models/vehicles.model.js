const mongoose = require("mongoose");

const vehiclesSchema = new mongoose.Schema(
  {
    vehicleNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    vehicleMake: {
      type: String,
    },
    speed: {
      type: Number,
    },
    latitude: {
      type: Number,
    },
    longitude: {
      type: Number,
    },
    currentAddress: {
      type: String,
    },
    fuelType: {
      type: String,
    },
    currentStatus: {
      type: String,
    },
    lastUpdateAt: {
      type: Date,
    },
    groupId: {
      type: Number,
    },
    driverDetails: {
      driverId: {
        type: Number,
      },
      driverName: {
        type: String,
      },
      driverNumber: {
        type: String,
      },
    },
  },
  { timestamps: true }
);

const VehiclsModel = mongoose.model('vehicles',vehiclesSchema)

module.exports = VehiclsModel;
