const express = require('express');
const router = express.Router();

const JobController = require('../controllers/job.conttroller');


router.post('/createJob', JobController.createJob)

module.exports = router;