const mongoose = require('mongoose');

const jobTouchpointsSchema = new mongoose.Schema({
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobDetails',
    required: true,
  },
  touchpoint: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const JobTouchpointsModel = mongoose.model('JobTouchpoints', jobTouchpointsSchema);

module.exports = JobTouchpointsModel;
