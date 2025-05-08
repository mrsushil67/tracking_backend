const mongoose = require("mongoose");

const VehiclePathSchema = new mongoose.Schema(
  {
    vehicleNo: {
      type: String,
      required: true,
    },
    latitude: {
      type: String,
      required: false,
    },
    longitude: {
      type: String,
      required: false,
    },
    speed: {
      type: String,
      required: false,
    },
    address: {
      type: String,
      required: false,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true
      }
    },
  },
  { timestamps: true }
);


// Create a 2dsphere index on the location field
VehiclePathSchema.index({ location: '2dsphere' });

VehiclePathSchema.index({ createdAt: 1 }, { expireAfterSeconds: 1296000 });

const VehiclePathModel = mongoose.model("vehiclePath", VehiclePathSchema);

module.exports = VehiclePathModel;
