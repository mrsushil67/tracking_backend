const XLSX = require("xlsx");
const axios = require("axios");
const VehicleModel = require("../models/vehicleList.model");
const { getToken } = require("../middlewares/authMiddleware");
const VehiclePathModel = require("../models/vehiclePath.model");
const AllVehiclesModel = require("../models/vehicles.model");
const moment = require("moment");
require("dotenv").config();

module.exports.createVehicles = async (req, res) => {
  try {
    const { vehicleNo } = req.body;
    if (!vehicleNo) {
      return res.status(400).json("vehicle no is required");
    }
    const existingVehicle = await VehicleModel.findOne({ vehicleNo });
    if (existingVehicle) {
      return res.status(400).json("Vehicle already registered");
    }
    const newVehicle = new VehicleModel({ vehicleNo });
    await newVehicle.save();
    return res.status(201).json({
      message: "Vehicle registered successfully",
      vehicle: newVehicle,
    });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

module.exports.getVehicles = async (req, res) => {
  try {
    const vehicles = await AllVehiclesModel.find({});
    // console.log("vehicleData :", vehicles);

    return res.status(200).json({
      message: "Vehicles Fetched Successfully",
      vehicles: vehicles,
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const updateVehicleDetails = async () => {
  try {
    const vehicles = await AllVehiclesModel.find({}, "vehicleNo"); // Fetch all vehicle numbers\
    const token = await getToken()
    // console.log("Token : ",token)

    const updateRequests = vehicles.map(async (e) => {
      try {
        const response = await axios.get(
          `https://api.fleetx.io/api/v1/analytics/live/byNumber/${e.vehicleNo}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        
        if (response && response.data) {
          const data = response.data;

          // Update the existing vehicle in the database
          await AllVehiclesModel.findOneAndUpdate(
            { vehicleNo: e.vehicleNo }, // Find by vehicle number
            {
              vehicleMake: data.vehicleMake,
              speed: data.speed,
              latitude: data.latitude,
              longitude: data.longitude,
              currentAddress: data.address,
              fuelType: data.fuelType,
              currentStatus: data.currentStatus,
              lastUpdateAt: data.lastUpdatedAt,
              groupId: data.groupId,
              driverDetails: {
                driverId: data.driverId,
                driverName: data.driverName,
                driverNumber: data.driverNumber,
              },
            },
            { new: true } // Return the updated document
          );
        }
      } catch (error) {
        console.error(
          `Failed to update vehicle ${e.vehicleNo}:`,
          error.message
        );
      }
    });

    await Promise.all(updateRequests); // Wait for all updates to finish
    console.log("All vehicle details updated successfully.");
  } catch (error) {
    console.error("Error updating vehicle details:", error.message);
  }
};

setInterval(updateVehicleDetails, 10 * 1000);

module.exports.registerVehiclesFromExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Please upload an Excel file" });
    }

    // Read Excel file
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      header: 1,
    });

    // Extract vehicle numbers
    const vehicleNumbers = sheetData.flat().filter(Boolean); // Remove empty values

    if (!vehicleNumbers.length) {
      return res
        .status(400)
        .json({ message: "No vehicle numbers found in the file" });
    }

    // Remove duplicates from the file
    const uniqueVehicleNumbers = [...new Set(vehicleNumbers)];

    // Find existing vehicles
    const existingVehicles = await AllVehiclesModel.find({
      vehicleNo: { $in: uniqueVehicleNumbers },
    });

    const existingVehicleNumbers = new Set(
      existingVehicles.map((v) => v.vehicleNo)
    );

    // Filter out already registered vehicles
    const newVehicles = uniqueVehicleNumbers
      .filter((vehicleNo) => !existingVehicleNumbers.has(vehicleNo))
      .map((vehicleNo) => ({ vehicleNo }));


    const token = getToken()
    // Insert new vehicles if any
    if (newVehicles.length > 0) {
      const requests = newVehicles.map(async (e) => {
        try {
          const response = await axios.get(
            `https://api.fleetx.io/api/v1/analytics/live/byNumber/${e.vehicleNo}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          if (response && response.data) {
            const data = response.data;
            // Create a new vehicle object from the response data
            const newVehicle = new AllVehiclesModel({
              vehicleNo: data.vehicleNumber,
              vehicleMake: data.vehicleMake,
              speed: data.speed,
              latitude: data.latitude,
              longitude: data.longitude,
              currentAddress: data.address,
              fuelType: data.fuelType,
              currentStatus: data.currentStatus,
              lastUpdateAt: data.lastUpdatedAt,
              groupId: data.groupId,
              driverDetails: {
                driverId: data.driverId,
                driverName: data.driverName,
                driverNumber: data.driverNumber,
              },
            });

            // console.log(newVehicle);
            await newVehicle.save();
            return { success: true, vehicles: newVehicle };
          } else {
            throw new Error(`No data found for vehicle: ${e.vehicleNo}`);
          }
        } catch (error) {
          return {
            success: false,
            vehicleNo: e.vehicleNo,
            error: error.message,
          };
        }
      });

      const vehicleResults = await Promise.all(requests); // Wait for all requests to finish

      const successfulRegistrations = vehicleResults.filter(
        (result) => result.success
      );
      const failedRegistrations = vehicleResults.filter(
        (result) => !result.success
      );

      // Optionally, store the failed registrations in a separate log or database collection for review
      if (failedRegistrations.length > 0) {
        console.error(
          "Failed to fetch data for the following vehicles:",
          failedRegistrations
        );
        // Optionally, save these errors to a "failed registrations" collection or send email notifications.
      }

      return res.status(201).json({
        message: "Vehicles processed successfully",
        registered: successfulRegistrations.length,
        failed: failedRegistrations.length,
        successfulRegistrations,
        failedRegistrations,
      });
    }

    return res.status(400).json({
      message: "No new vehicles to register",
    });
  } catch (error) {
    console.error("Error in registerVehiclesFromExcel:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

module.exports.getLiveVehicleData = async (req, res) => {
  try {
    const { vehicleNo } = req.query;
    if (!vehicleNo) {
      return res.status(400).json({ error: "Vehicle number is required." });
    }

    const data = await AllVehiclesModel.findOne({ vehicleNo });
    if (!data) {
      return res.status(404).json({ message: "vehicle not exist" });
    }

    return res
      .status(200)
      .json({ message: "vehicle fetched successfully ", data });
  } catch (error) {
    console.error(
      "Error fetching vehicle data:",
      error.response?.data || error.message
    );

    return res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || "Failed to fetch vehicle data",
    });
  }
};

const addVehiclePath = async () => {
  try {
    const fleetsVehicles = await AllVehiclesModel.find({});

    const token = await getToken()

    fleetsVehicles.forEach(async (e) => {
      try {
        const vehiclePos = await axios.get(
          `https://api.fleetx.io/api/v1/analytics/live/byNumber/${e.vehicleNo}`,
          { headers: { Authorization: `bearer ${token}` } }
        );

        // console.log(vehiclePos.data)
        const { vehicleNumber, latitude, longitude, speed, address } = vehiclePos.data;

        const existingVehiclePath = await VehiclePathModel.findOne({
          vehicleNo: e.vehicleNo,
        });
        if (!existingVehiclePath) {
          const newData = new VehiclePathModel({
            vehicleNo: vehicleNumber,
            latitude: latitude,
            longitude: longitude,
            speed: speed,
            address: address || "N/A",
          });
          await newData.save();
        }

        // if (parseFloat(speed) > 0) {
        //   const newData = new VehiclePathModel({
        //     vehicleNo: vehicleNumber,
        //     latitude: latitude,
        //     longitude: longitude,
        //     speed: speed,
        //     address: address || "N/A",
        //   });
        //   await newData.save();
        // } else {
        //   // console.log("Skipping entry because speed is 0:", speed);
        // }

        if (speed !== "0") {
          // console.log("Ye bala +++++++++++++++++++++++++++++++")
          const newData = new VehiclePathModel({
            vehicleNo: vehicleNumber,
            latitude: latitude,
            longitude: longitude,
            speed: speed,
            address: address || "N/A",
          });
          await newData.save();
        }else{
          console.log(speed)
        }
      } catch (error) {
        if (error?.response?.status === 404) {
          // console.log(
          //   `${error?.response?.data?.error_description} ${error?.response?.data?.error}`
          // );
        }
      }
    });
  } catch (error) {
    console.log("Error : ", error);
  }
};
setInterval(addVehiclePath, 10 * 1000);

module.exports.getVehiclesPath = async (req, res) => {
  const { vehicleNo, fromDate } = req.query;
  if(!vehicleNo){
    return res.status(400).json({message:"vehicle no is required"})
  }

  console.log(req.query)
  try {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setTime(
      twentyFourHoursAgo.getTime() - 24 * 60 * 60 * 1000
    );
    console.log(twentyFourHoursAgo)
    const vehicle = await AllVehiclesModel.findOne({ vehicleNo: vehicleNo });

    if (!vehicle) {
      return res.status(401).json({ message: "Invalid vehicle number" });
    }

    const vehiclePath = await VehiclePathModel.find({
      vehicleNo: vehicleNo,
      createdAt: { $gte: twentyFourHoursAgo },
    }).sort({ createdAt: 1 });

    const latlongArray = vehiclePath.map((position) => ({
      lat: parseFloat(position.latitude),
      lng: parseFloat(position.longitude),
      // speed: parseFloat(position.speed),
      // address: position.address,
      time: position.createdAt,
    }));

    return res.status(200).json(latlongArray);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports.filterVehiclePath = async (req, res) => {
  try {
    const { vehicleNo, startDate, endDate } = req.query;
    console.log("Query : ", req.query);

    if (!vehicleNo || !startDate || !endDate) {
      return res.status(400).json({
        error: "Missing vehicleNo or startDate or endDate in query parameters.",
      });
    }

    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);

    if (isNaN(startDateObj) || isNaN(endDateObj)) {
      return res
        .status(400)
        .json({ error: "Invalid date format. Use YYYY-MM-DD." });
    }

    // Ensure the end date includes the full day (set to end of the day)
    endDateObj.setHours(23, 59, 59, 999);

    // Fetch data within the date range
    const response = await VehiclePathModel.find({
      vehicleNo: vehicleNo,
      createdAt: {
        $gte: startDateObj,
        $lte: endDateObj,
      },
    });

    const latlongArray = response.map((position) => ({
      lat: parseFloat(position.latitude),
      lng: parseFloat(position.longitude),
      // speed: parseFloat(position.speed),
      // address: position.address,
      time: position.createdAt,
    }));

    return res.status(200).json(latlongArray);
  } catch (error) {
    console.error("Error processing dates:", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports.filterVehicleByNumber = async (req, res) => {
  const { vehicleNo } = req.query;

  try {
    const vehicle = await AllVehiclesModel.findOne({ vehicleNo });

    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle number does not exist" });
    }

    const token = await getToken();
    const response = await axios.get(
      `https://api.fleetx.io/api/v1/analytics/live/byNumber/${vehicleNo}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return res.status(200).json(response.data);
  } catch (error) {
    console.error("Error fetching vehicle:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// total current running vehicles
module.exports.totalRunningVehicles = async (req, res) => {
  try {
    const vehicles = await AllVehiclesModel.find({ speed: { $gt: 0 } });
    res.status(200).json({
      success: true,
      count: vehicles.length,
      runningVehicles: vehicles,
    });
  } catch (error) {
    console.log(error);
  }
};

// get address, Distanse, km, time road
async function getRoadDistance(lat1, lon1, lat2, lon2) {
  const apiKey = process.env.MAP_API_KEY; // Replace with your key
  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${lat1},${lon1}&destination=${lat2},${lon2}&key=${apiKey}`;

  try {
    const response = await axios.get(url);
    const data = response.data;

    if (data.routes.length > 0) {
      const route = data.routes[0].legs[0];

      const distance = route.distance.text; // Distance in km/miles
      const duration = route.duration.text; // Travel time
      const startAddress = route.start_address; // Start location address
      const endAddress = route.end_address; // Destination address

      console.log(`Start Address: ${startAddress}`);
      console.log(`End Address: ${endAddress}`);
      console.log(`Road Distance: ${distance}`);
      console.log(`Estimated Duration: ${duration}`);

      return { startAddress, endAddress, distance, duration };
    } else {
      console.log("No route found");
      return null;
    }
  } catch (error) {
    console.error("Error fetching road distance:", error);
    return null;
  }
}
// getRoadDistance(28.10042, 77.33588166666668, 19.076090, 72.877426);


