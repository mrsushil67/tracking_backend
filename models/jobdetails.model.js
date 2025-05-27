const mongoose = require("mongoose");

const jobDetailsSchema = new mongoose.Schema({
  Id: {
    type: Number,
    required: true,
    unique: true,
  },
  TripSheet: {
    type: String,
    required: false,
  },
  RouteId: {
    type: Number,
    required: false,
  },
  VehicleNo: {
    type: String,
    required: false,
  },
  CustomerName: {
    type: String,
    required: false,
  },
  SourceCity: {
    type: String,
    required: false,
  },
  SourceCoords: {
    lat: {
      type: String,
      required: false,
    },
    long: {
      type: String,
      required: false,
    },
  },
  DestinationCity: {
    type: String,
    required: false,
  },
  DestinationCoords: {
    lat: {
      type: String,
      required: false,
    },
    long: {
      type: String,
      required: false,
    },
  },
  Job_Departure: {
    type: Date,
    required: false,
  },
  Job_Arrival: {
    type: Date,
    required: false,
  },
  Job_Desc: {
    type: String,
    required: false,
  },
  TripType: {
    type: Number,
    required: false,
  },
  Dept: {
    type: String,
    required: false,
  },
  Arr: {
    type: String,
    required: false,
  },
  Job_Start: {
    type: Date,
    required: false,
  },
  createdAt: {
    type: Date,
    required: false,
  },
  updatedAt: {
    type: Date,
    required: false,
  },
});

const JobDetailsModel = mongoose.model("jobDetails", jobDetailsSchema);

module.exports = JobDetailsModel;
