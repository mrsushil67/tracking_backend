const mongoose = require('mongoose');

const VehicleListSchema = new mongoose.Schema({
    vehicleNo:{
        type: String,
        required: true,
        unique: true,
        trim: true,
    }
},{timestamps: true})

const vehicleListModel = mongoose.model('vehicleList',VehicleListSchema);

module.exports = vehicleListModel;

