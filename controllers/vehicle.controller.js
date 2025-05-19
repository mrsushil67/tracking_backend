const XLSX = require("xlsx");
const axios = require("axios");
const VehicleModel = require("../models/vehicleList.model");
const { getToken } = require("../middlewares/authMiddleware");
const VehiclePathModel = require("../models/vehiclePath.model");
const AllVehiclesModel = require("../models/vehicles.model");
const moment = require("moment");
const { sendNotification } = require("../services/notify.service");
require("dotenv").config();
const cron = require("node-cron");
const NotificationModel = require("../models/notification.model");

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
    const token = await getToken();
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

    await Promise.all(updateRequests);
    sendNotification();
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

    const token = getToken();
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

    const token = await getToken();

    fleetsVehicles.forEach(async (e) => {
      try {
        const vehiclePos = await axios.get(
          `https://api.fleetx.io/api/v1/analytics/live/byNumber/${e.vehicleNo}`,
          { headers: { Authorization: `bearer ${token}` } }
        );

        // console.log(vehiclePos.data)
        const { vehicleNumber, latitude, longitude, speed, address } =
          vehiclePos.data;

        const vehiclePath = new VehiclePathModel({
          vehicleNo: vehicleNumber,
          latitude,
          longitude,
          speed,
          address: address || "N/A",
          location: {
            type: "Point",
            coordinates: [parseFloat(longitude), parseFloat(latitude)],
          },
          timestamp: new Date(), // if you're tracking time
        });

        await vehiclePath.save();
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
  if (!vehicleNo) {
    return res.status(400).json({ message: "vehicle no is required" });
  }

  console.log("Query2 : ", req.query);
  try {
    const time24 = moment().subtract(24, "h");
    const twentyFourHoursAgo = new Date(time24);
    console.log("time24", new Date(time24));

    // twentyFourHoursAgo.setTime(
    //   twentyFourHoursAgo.getTime() - 24 * 60 * 60 * 1000
    // );
    // console.log(twentyFourHoursAgo)
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

function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371000; // Earth radius in meters

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function isNear(p1, p2, maxMeters) {
  return getDistanceMeters(p1.lat, p1.long, p2.lat, p2.long) <= maxMeters;
}

module.exports.getRootDataByTripDetails = async (req, res) => {
  try {
    const { vehicleNo, source, destination, jobDept_Date, jobArr_Date } =
      req.body;

    console.log("Received Body:", req.body);

    if (
      !vehicleNo ||
      !source?.lat ||
      !source?.long ||
      !destination?.lat ||
      !destination?.long ||
      !jobDept_Date ||
      !jobArr_Date
    ) {
      return res
        .status(400)
        .json({status:400, message: "Invalid or missing trip details" });
    }

    const startDate = new Date(jobDept_Date);
    const endDate = new Date(jobArr_Date);

    const oneDayMs = 24 * 60 * 60 * 1000;
    let queryStart = new Date(startDate.getTime());
    let queryEnd = new Date(endDate.getTime());

    console.log("Initial Query Start:", queryStart.toISOString());
    console.log("Initial Query End:", queryEnd.toISOString());

    if (isNaN(queryStart) || isNaN(queryEnd)) {
      return res.status(400).json({status:400, message: "Invalid date format" });
    }

    let vehiclePaths = [];
    let startIndex = -1;
    let endIndex = -1;

    for (let attempt = 0; attempt < 6; attempt++) {

      console.log("StartIndex : ",startIndex)
      console.log("endIndex : ",endIndex)

      vehiclePaths = await VehiclePathModel.find({
        vehicleNo,
        createdAt: {
          $gte: queryStart,
          $lte: queryEnd,
        },
      }).sort({ createdAt: 1 });

      console.log(
        `Attempt ${attempt + 1}: Total Path Points Found:`,
        vehiclePaths.length
      );

      if (vehiclePaths.length) {
        const src = {
          lat: parseFloat(source.lat),
          long: parseFloat(source.long),
        };
        const dest = {
          lat: parseFloat(destination.lat),
          long: parseFloat(destination.long),
        };

        startIndex = vehiclePaths.findIndex((v) =>
          isNear(
            { lat: v.location.coordinates[1], long: v.location.coordinates[0] },
            src,
            4000
          )
        );

        endIndex = [...vehiclePaths]
          .reverse()
          .findIndex((v) =>
            isNear(
              {
                lat: v.location.coordinates[1],
                long: v.location.coordinates[0],
              },
              dest,
              5000
            )
          );

        if (startIndex !== -1 && endIndex !== -1) {
          endIndex = vehiclePaths.length - 1 - endIndex;
          break;
        }
      }

      if (startIndex === -1) {
        queryStart = new Date(queryStart.getTime() - oneDayMs);
        console.log(`Adjusting Query Start: ${queryStart.toISOString()}`);
      }

      if (endIndex === -1) {
        queryEnd = new Date(queryEnd.getTime() + oneDayMs);
        console.log(`Adjusting Query End: ${queryEnd.toISOString()}`);
      }
    }

    if (startIndex === -1) {
      console.warn("Fallback: Using first point as start location");
      startIndex = 0;
    }

    if (endIndex === -1) {
      console.warn("Fallback: Using last point as end location");
      endIndex = vehiclePaths.length - 1;
    }

    console.log("startIndex : ",startIndex)
    console.log("endIndex : ",endIndex)

    if (
      startIndex >= vehiclePaths.length ||
      endIndex >= vehiclePaths.length ||
      startIndex > endIndex
    ) {
      return res.status(404).json({
        status:404,
        vehiclePaths,
        message:
          "Unable to resolve trip path: Source or Destination Coords are out of our radius.",
      });
    }

    const fullTrip = vehiclePaths.slice(startIndex, endIndex + 1);

    // Find stops
    const stops = [];
    let stopStart = null;
    let stopEnd = null;
    let stopCount = 0;

    for (let i = 0; i < fullTrip.length; i++) {
      const current = fullTrip[i];
      const next = fullTrip[i + 1];

      if (current.speed === "0") {
        if (!stopStart) {
          stopStart = current;
        }
        stopCount++;
      } else {
        if (stopStart && stopCount > 60) {
          stopEnd = current;
          const durationMs =
            new Date(stopEnd.createdAt) - new Date(stopStart.createdAt);
          const duration = {
            hours: Math.floor(durationMs / (1000 * 60 * 60)),
            minutes: Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60)),
            seconds: Math.floor((durationMs % (1000 * 60)) / 1000),
          };

          stops.push({
            location: {
              lat: stopStart.location.coordinates[1],
              long: stopStart.location.coordinates[0],
            },
            startTime: stopStart.createdAt,
            endTime: stopEnd.createdAt,
            duration,
            address: stopStart.address || "N/A",
          });
        }
        stopStart = null;
        stopCount = 0;
      }
    }

    return res.status(200).json({
      totalPoints: fullTrip.length,
      fromTime: vehiclePaths[startIndex].createdAt,
      toTime: vehiclePaths[endIndex].createdAt,
      path: fullTrip,
      stops,
    });
  } catch (error) {
    console.error("Error processing trip details:", error.message);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

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
// getRoadDistance(19.32476785, 73.553843, 22.292720172, 75.787532089);

module.exports.getVehicleCurrentLoc = async (req, res) => {
  const { vehicleNo } = req.query;
  if (!vehicleNo) {
    return res.status(400).json({ message: "vehicle no is required" });
  }

  try {
    const vehicle = await AllVehiclesModel.findOne({ vehicleNo: vehicleNo });

    if (!vehicle) {
      return res.status(404).json({ message: "Invalid vehicle number" });
    }

    const latestVehiclePath = await VehiclePathModel.findOne({
      vehicleNo: vehicleNo,
    }).sort({ createdAt: -1 }); // Fetch the latest entry

    if (!latestVehiclePath) {
      return res.status(404).json({ message: "No location data found" });
    }

    const currentLocation = {
      lat: parseFloat(latestVehiclePath.latitude),
      lng: parseFloat(latestVehiclePath.longitude),
      time: latestVehiclePath.createdAt,
    };

    return res.status(200).json(currentLocation);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const DeletePathData = async () => {
  try {
    const tenDaysAgo = moment().subtract(5, "days").toDate();

    console.log(tenDaysAgo);
    await VehiclePathModel.deleteMany({
      createdAt: {
        $lte: tenDaysAgo,
      },
    });

    console.log("Data older than 5 days deleted successfully.");
  } catch (error) {
    console.error("Error deleting data older than 5 days:", error.message);
  }
};

const DeleteNotification = async () => {
  try {
    const twoDaysAgo = moment().subtract(2, "days").toDate();

    await NotificationModel.deleteMany({
      createdAt: {
        $lte: twoDaysAgo,
      },
    });

    console.log("Data older than 2 days deleted successfully.");
  } catch (error) {
    console.error("Error deleting data older than 2 days:", error.message);
  }
};

cron.schedule("0 2 * * *", () => {
  DeletePathData();
});

cron.schedule("0 3 * * *", () => {
  DeleteNotification();
});

// module.exports.getRootDataByTripDetails = async (req, res) => {
//   try {
//     const { vehicleNo, source, destination, jobDept_Date, jobArr_Date } =
//       req.body;

//     console.log("Received Body:", req.body);

//     if (
//       !vehicleNo ||
//       !source?.lat ||
//       !source?.long ||
//       !destination?.lat ||
//       !destination?.long ||
//       !jobDept_Date ||
//       !jobArr_Date
//     ) {
//       return res
//         .status(400)
//         .json({ message: "Invalid or missing trip details" });
//     }

//     const startDate = new Date(jobDept_Date);
//     const endDate = new Date(jobArr_Date);

//     const oneDayMs = 24 * 60 * 60 * 1000;
//     let queryStart = new Date(startDate.getTime() - oneDayMs);
//     let queryEnd = new Date(endDate.getTime() + oneDayMs);

//     console.log("Initial Query Start:", queryStart.toISOString());
//     console.log("Initial Query End:", queryEnd.toISOString());

//     if (isNaN(queryStart) || isNaN(queryEnd)) {
//       return res.status(400).json({ message: "Invalid date format" });
//     }

//     const vehiclePaths = await VehiclePathModel.find({
//       vehicleNo,
//       createdAt: {
//         $gte: queryStart,
//         $lte: queryEnd,
//       },
//     }).sort({ createdAt: 1 });

//     console.log(`Total Path Points Found:`, vehiclePaths.length);

//     if (!vehiclePaths.length) {
//       return res.status(404).json({ message: "No path data found" });
//     }

//     const isNear = (point1, point2, threshold = 0.01) => {
//       return (
//         Math.abs(point1.lat - point2.lat) <= threshold &&
//         Math.abs(point1.long - point2.long) <= threshold
//       );
//     };

//     const src = { lat: parseFloat(source.lat), long: parseFloat(source.long) };
//     const dest = {
//       lat: parseFloat(destination.lat),
//       long: parseFloat(destination.long),
//     };

//     const startIndex = vehiclePaths.findIndex((v) =>
//       isNear(
//         { lat: parseFloat(v.latitude), long: parseFloat(v.longitude) },
//         src
//       )
//     );

//     const endIndex = vehiclePaths.findIndex((v) =>
//       isNear(
//         { lat: parseFloat(v.latitude), long: parseFloat(v.longitude) },
//         dest
//       )
//     );

//     if (startIndex === -1 || endIndex === -1 || startIndex > endIndex) {
//       return res.status(404).json({
//         message: "Unable to find a valid path between source and destination",
//       });
//     }

//     const actualPath = vehiclePaths.slice(startIndex, endIndex + 1);

//     return res.status(404).json({
//       totalPoints: actualPath.length,
//       fromTime: actualPath[0].createdAt,
//       toTime: actualPath[actualPath.length - 1].createdAt,
//       path: actualPath,
//     });
//   } catch (error) {
//     console.error("Error processing trip details:", error.message);
//     return res.status(500).json({
//       message: "Internal Server Error",
//       error: error.message,
//     });
//   }
// };
