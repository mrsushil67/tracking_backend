const mongoose = require("mongoose");

const jobDetailsSchema = new mongoose.Schema(
  {
    ID: {
      type: Number,
      required: true,
      unique: true,
      trim: true,
    },
    CustId: {
      type: Number,
      required: true,
      trim: true,
    },
    RouteId: {
      type: Number,
      required: true,
      trim: true,
    },
    TripType: {
      type: Number,
      required: true,
      trim: true,
    },
    VehicleId: {
      type: Number,
      required: true,
      trim: true,
    },
    Driver1Id: {
      type: Number,
      required: true,
      trim: true,
    },
    Driver2Id: {
      type: Number,
      trim: true,
      default: null,
    },
    VPlaceTime: {
      type: Date,
      required: true,
      trim: true,
    },
    DepartureTime: {
      type: Date,
      trim: true,
      default: null,
    },
    Remark: {
      type: String,
      trim: true,
    },
    TripSheet: {
      type: String,
      trim: true,
    },
    CreatedBy: {
      type: Number,
      required: true,
      trim: true,
    },
    CreatedTime: {
      type: Date,
      required: true,
      trim: true,
      default: Date.now,
    },
    Status: {
      type: Number,
      required: true,
      trim: true,
      default: 0,
    },
    Is_Amended: {
      type: Number,
      required: true,
      trim: true,
      default: 0,
    },
    AmendReason: {
      type: Number,
      required: true,
      trim: true,
      default: 0,   
    },
    ParentTripNo: {
      type: String,
      required: true,
      trim: true,
      default: null,
    },
    BookingType: {
      type: Number,
      trim: true,
      default:null,
    },
    PlanCat: {
      type: Number,
      required: true,
      trim: true,
      default: 0,
    },
    Is_Completed: {
      type: Number,
      required: true,
      trim: true,
      default: 0,
    },
    Is_Settled: {
      type: Number,
      trim: true,
      default: null,
    },
    Is_Verified: {
      type: Number,
      required: true,
      trim: true,
        default: 0, 
    },
    Tcat: {
      type: Number,
      trim: true,
      default: null
    },
    BrId: {
      type: Number,
      trim: true,
      default: null
    },
    Is_peak: {
      type: Number,
      trim: true,
      default: null
    },
  },
  { timestamps: true }
);

const JobDetailsModel = mongoose.model("jobDetails", jobDetailsSchema);

module.exports = JobDetailsModel;