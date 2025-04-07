const express = require('express')
const app = express()
const cors = require('cors')
const VehicleRoutes = require('./routes/vehicle.route');
const VehiclePathModel = require('./models/vehiclePath.model');

app.use(express.json())
app.use(cors())

app.get('/', (req, res) => res.send('Hello World!'));

app.use('/api/v1/vehicle',VehicleRoutes)

const activeStreams = new Map(); // key: vehicleNo or clientId, value: abortController

app.get("/stream-path", async (req, res) => {
  const {vehicleNo, chunkSize, interval, startDate, endDate} = req.query;
  console.log("Query  :",req.query)

  // Setup SSE headers
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.flushHeaders();

  // Abort any previous stream for this vehicle
  if (activeStreams.has(vehicleNo)) {
    const prev = activeStreams.get(vehicleNo);
    prev.abortController.abort();
    activeStreams.delete(vehicleNo);
  }

  const abortController = new AbortController();
  activeStreams.set(vehicleNo, { abortController });

  try {
    const cursor = VehiclePathModel.find({ vehicleNo, createdAt: {$gte : new Date(startDate),$lte : new Date(endDate)}}).cursor();
    const totalData = await VehiclePathModel.countDocuments({ vehicleNo,  createdAt: {$gte : new Date(startDate), $lte : new Date(endDate)}});

    res.write(`event: total-path\ndata: ${JSON.stringify({ totalData })}\n\n`);

    let chunk = [];

    const sendChunk = () => {
      if (chunk.length > 0) {
        const latlongArray = chunk.map((position) => ({
          lat: parseFloat(position.latitude),
          lng: parseFloat(position.longitude),
          time: position.createdAt,
        }));

        res.write(`event: vehicle-path\ndata: ${JSON.stringify(latlongArray)}\n\n`);
        chunk = [];
      }
    };

    for await (const doc of cursor) {
      if (abortController.signal.aborted) {
        console.log("SSE stream aborted for", vehicleNo);
        break;
      }

      chunk.push(doc);

      if (chunk.length >= chunkSize) {
        sendChunk();
        await new Promise((resolve) => setTimeout(resolve, interval));
      }
    }

    sendChunk();
    res.write(`event: No-more\ndata: no more data\n\n`);
    res.end();

    activeStreams.delete(vehicleNo);
  } catch (err) {
    console.error("SSE stream error:", err);
    res.write(`event: error\ndata: ${JSON.stringify({ message: "Internal Server Error" })}\n\n`);
    res.end();
    activeStreams.delete(vehicleNo);
  }
});


module.exports = app