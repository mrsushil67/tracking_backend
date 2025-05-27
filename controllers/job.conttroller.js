const moment = require("moment");
const axios = require("axios");
const JobDetailsModel = require("../models/jobdetails.model");
const JobTouchpointsModel = require("../models/jobtouchpoints.model");
const VehiclsModel = require("../models/vehicles.model");

module.exports.createJob = async (req, res) => {
  try {
    const start = "24-05-2025";
    const end = moment(start, "DD-MM-YYYY")
      .add(10, "days")
      .format("DD-MM-YYYY");
    const rowsPerPage = 1000;
    const currentPage = 1;

    const skip = (currentPage - 1) * rowsPerPage;

    // Constructing query parameters dynamically
    let queryParams = `skip=${skip}&take=${rowsPerPage}`;

    if (start && end) {
      queryParams += `&formdate=${start}&Todate=${end}`;
    }

    console.log(queryParams);
    const getJobs = await axios.get(
      `https://rcm.snaptrak.tech/VehicleJobList?${queryParams}`
    );
    const jobData = getJobs.data;

    for (const job of jobData.data) {
      const existingJob = await JobDetailsModel.findOne({
        Id: job.id,
        TripSheet: job.TripSheet,
      });

      const jobInDetails = await axios.get(
        `https://rcm.snaptrak.tech/VehicleJobListDeatils?id=${job.id}`
      );
      const jobDetails = jobInDetails.data;

      const jobDetailsData = {
        Id: jobDetails.trip.id,
        VehicleNo: jobDetails.trip.Vehicle_no,
        TripSheet: jobDetails.trip.TripSheet,
        RouteId: jobDetails.trip.RouteId,
        CustomerName: job.CustomerName,
        SourceCity: jobDetails.trip.SourceCity,
        SourceCoords: {
          lat: jobDetails.trip.SourceLat,
          long: jobDetails.trip.SourceLong,
        },
        DestinationCity: jobDetails.trip.DestCity,
        DestinationCoords: {
          lat: jobDetails.trip.DestLat,
          long: jobDetails.trip.DestLong,
        },
        Job_Departure: jobDetails.trip.Job_Departure,
        Job_Arrival: jobDetails.trip.Job_Arrivle,
        Job_Desc: job.Job_Desc,
        TripType: jobDetails.trip.TripType,
        Dept: jobDetails.trip.Dept,
        Arr: jobDetails.trip.Arr,
        Job_Start: new Date(jobDetails.trip.Job_Start),
        createdAt: new Date(jobDetails.trip.createdAt),
        updatedAt: new Date(jobDetails.trip.updatedAt),
      };

      if (existingJob) {
        console.log(`Job with ID ${job.id} already exists. Updating...`);
        await JobDetailsModel.updateOne(
          { _id: existingJob._id },
          { $set: jobDetailsData }
        );
      } else {
        const jobDetailsModel = new JobDetailsModel(jobDetailsData);
        await jobDetailsModel.save();
      }

      if (Array.isArray(jobDetails.touch)) {
        jobDetails.touch = jobDetails.touch.filter(
          (touch) => touch.Id !== null
        );
        for (const touch of jobDetails.touch) {
          const jobTouchPoints = {
            jobId: existingJob ? existingJob._id : jobDetailsData._id,
            Id: touch.Id,
            TouchPoint: touch.TouchPoint,
            TouchCoords: {
              lat: touch.TouchLat,
              long: touch.TouchLong,
            },
            SchDept: touch.ShuDept ? touch.ShuDept : null,
            SchArr: touch.ShuArr ? touch.ShuArr : null,
            InDate: touch.InDate ? touch.InDate : null,
            OutDate: touch.OutDate ? touch.OutDate : null,
            InTime: touch.InTime ? touch.InTime : null,
            OutTime: touch.OutTime ? touch.OutTime : null,
            TripType: touch.TripType,
          };

          const existingTouchPoint = await JobTouchpointsModel.findOne({
            jobId: jobTouchPoints.jobId,
            Id: touch.Id,
          });

          if (existingTouchPoint) {
            await JobTouchpointsModel.updateOne(
              { _id: existingTouchPoint._id },
              { $set: jobTouchPoints }
            );
          } else {
            const jobTouchpointsModel = new JobTouchpointsModel(jobTouchPoints);
            try {
              await jobTouchpointsModel.save();
            } catch (error) {
              console.error("Error saving job touchpoint:", {
                jobTouchPoints,
                error: error.message,
              });
              throw error; // Re-throw the error to ensure it propagates
            }
          }
        }
      }
    }

    res.status(201).send({ message: "Jobs processed successfully" });
  } catch (error) {
    console.error("Error fetching jobs:", error.message);
    res.status(500).send({ error: "An error occurred while processing jobs" });
  }
};

module.exports.getAllJobs = async (req, res) => {
  try {
    const { skip = 0, take = 10, formdate, Todate, vehicle } = req.query;

    // Build the query object dynamically
    const query = {};
    if (formdate && Todate) {
      query.Job_Start = {
        $gte: new Date(moment(formdate, "DD-MM-YYYY").startOf("day")),
        $lte: new Date(moment(Todate, "DD-MM-YYYY").endOf("day")),
      };
    }
    if (vehicle) {
      query.VehicleNo = { $regex: vehicle, $options: "i" }; // Case-insensitive search
    }

    // Fetch jobs with pagination and filtering
    const jobs = await JobDetailsModel.find(query)
      .skip(parseInt(skip))
      .limit(parseInt(take));

    const totalJobs = await JobDetailsModel.countDocuments(query);

    res.status(200).send({
      jobs,
      totalJobs,
      message: "Jobs fetched successfully",
    });
  } catch (error) {
    console.error("Error fetching all jobs:", error.message);
    res.status(500).send({ error: "An error occurred while fetching jobs" });
  }
};

module.exports.getJobById = async (req, res) => {
  try {
    const { Id, TripSheet } = req.query;

    console.log(`Fetching job with ID: ${Id} and TripSheet: ${TripSheet}`);

    const job = await JobDetailsModel.findOne({ Id: Id, TripSheet: TripSheet });

    if (!job) {
      return res.status(404).send({ error: "Job not found" });
    }

    const touchpoints = await JobTouchpointsModel.find({ jobId: job._id });

    res.status(200).send({
      job,
      touchpoints,
      message: "Job and touchpoints fetched successfully",
    });
  } catch (error) {
    console.error(
      `Error fetching job with ID ${req.params.Id}:`,
      error.message
    );
    res.status(500).send({
      error: "An error occurred while fetching the job and touchpoints",
    });
  }
};

const updateJob = async (Id) => {
  try {
    const jobDetails = await JobDetailsModel.findOne({ Id: Id });

    if (!jobDetails) {
      throw new Error("Job not found");
    }

    const touchpoints = await JobTouchpointsModel.find({ jobId: jobDetails._id });

    const vehicleDetails = await VehiclsModel.findOne({
      vehicleNo: jobDetails.VehicleNo,
    });

    const JobWithVehicle = {
      ...jobDetails.toObject(),
      vehicleDetails: vehicleDetails ? vehicleDetails.toObject() : null,
      touchpoints: touchpoints.map((touch) => touch.toObject()),
    };

    console.log("Job Details: ", JobWithVehicle);
  } catch (error) {
    console.error("Error updating job: ", error.message);
    throw error; // Re-throw the error to ensure it propagates
  }
};

updateJob(1450);
