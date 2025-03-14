const express = require('express')
const app = express()
const cors = require('cors')
const VehicleRoutes = require('./routes/vehicle.route');

app.use(express.json())
app.use(cors())

app.get('/', (req, res) => res.send('Hello World!'));

app.use('/api/v1/vehicle',VehicleRoutes)

module.exports = app