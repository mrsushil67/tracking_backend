const mongoose = require('mongoose');

const jobTouchpointsSchema = new mongoose.Schema({
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobDetails',
    required: true,
  },
  Id: {
    type: Number,
    required: true,
  },
  TouchPoint: {
    type: String,
    required: false,
  },
  TouchCoords: {
    lat: {
      type: String,
      required: false,
    },
    long: {
      type: String,
      required: false,
    },
  },
  SchDept:{
    type: String,
    required: false,
  },
  SchArr:{
    type: String,
    required: false, 
  },
  InDate: {
    type: String,
    required: false,
  },
  OutDate: {
    type: String,
    required: false,
  },
  InTime: {
    type: String,
    required: false,
  },
  OutTime: {
    type: String,
    required: false,
  },
  TripType: {
    type: Number,
    required: false,
  },
  crossed: {
    type: Boolean,
    default: false,
  },
});

const JobTouchpointsModel = mongoose.model('JobTouchpoints', jobTouchpointsSchema);

module.exports = JobTouchpointsModel;
