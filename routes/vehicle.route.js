const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const VehicleController = require("../controllers/vehicle.controller");
const VehiclePathModel = require("../models/vehiclePath.model");
const VehiclsModel = require("../models/vehicles.model");

router.post("/addVehicle", VehicleController.createVehicles);
router.post(
  "/register-bulk",
  upload.single("file"),
  VehicleController.registerVehiclesFromExcel
);
router.get("/allVehicles", VehicleController.getVehicles);

router.get("/getVehicle", VehicleController.getLiveVehicleData);

router.get("/vehiclePath", VehicleController.getVehiclesPath);

router.get("/filterPath", VehicleController.filterVehiclePath);

router.get("/getVehicleByNumber", VehicleController.filterVehicleByNumber);

router.get("/totalRunning", VehicleController.totalRunningVehicles);

router.get('/vehicle-path', async (req, res) => {
    const { vehicleNo, batchSize = 10} = req.query;
  
    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
  
    // Send a keep-alive message every 5 seconds
    const keepAlive = setInterval(() => {
      res.write(': keep-alive\n\n');
    }, 5000);
  
    // Close the connection when client disconnects
    req.on('close', () => {
      console.log('Client disconnected');
      clearInterval(keepAlive);
      res.end();
    });
  
    try {
      const cursor = VehiclsModel.find();
      console.log(cursor)
  
      for await (const doc of cursor) {
        res.write(`data: ${JSON.stringify({ latitude: doc.latitude, longitude: doc.longitude, timestamp: doc.createdAt })}\n\n`);
        await new Promise((resolve) => setTimeout(resolve, 1));  // Delay between batches
      }
      res.end();
    } catch (err) {
      console.error('Error streaming data:', err);
      res.write('data: {"message": "Streaming error, please reconnect"}\n\n');
      res.end();
    }
  });
  
  
  

module.exports = router;
