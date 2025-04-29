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

module.exports = router;
