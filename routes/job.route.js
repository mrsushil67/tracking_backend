const express = require('express');
const router = express.Router();

const JobController = require('../controllers/job.conttroller');


router.get('/createJob', JobController.createJob);

router.get('/getAllJobs', JobController.getAllJobs);

router.get('/getJobById', JobController.getJobById);

module.exports = router;