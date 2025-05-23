const JobDetailsModel = require("../models/jobdetails.model");

module.exports.createJob = async (req, res) => {
  try {
    const {
      ID,
      CustId,
      RouteId,
      TripType,
      VehicleId,
      Driver1Id,
      VPlaceTime,
      DepartureTime,
      Remark,
      TripSheet,
      CreatedBy,
      CreatedTime,
      Status,
      Is_Amended,
      AmendReason,
      ParentTripNo,
      BookingType,
      PlanCat,
      Is_Completed,
      Is_Settled,
      Is_Verified,
      Tcat,
      BrId,
      Is_peak,
    } = req.body;

    // Validate required fields
    if (!ID || !CustId || !RouteId || !TripType || !VehicleId || !Driver1Id || !VPlaceTime || !DepartureTime || !TripSheet) {
      return res.status(400).json({ message: "Please fill all required fields" });
    }
    const existingJob = await JobDetailsModel.findOne({ TripSheet });
    if (existingJob) {
      return res.status(400).json({ message: "TripSheet already exists" });
    }
    // Validate required fields                        
    const newJob = new JobDetailsModel({
        ID,
        CustId,
        RouteId,
        TripType,
        VehicleId,
        Driver1Id,
        VPlaceTime: new Date(VPlaceTime),
        DepartureTime: new Date(DepartureTime),
        Remark,
        TripSheet,
        CreatedBy,
        CreatedTime: new Date(CreatedTime),
        Status,
        Is_Amended,
        AmendReason,
        ParentTripNo,
        BookingType,
        PlanCat,
        Is_Completed,
        Is_Settled,
        Is_Verified,
        Tcat,
        BrId,
        Is_peak,
    });

    console.log("New Job Details:", newJob);
    const savedJob = await newJob.save();
    res.status(201).json({status: true, savedJob, message: "Job created successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
