const http = require("http");
const app = require("./app");
require("dotenv").config();
require("./config/dbConnection");
const { Server } = require("socket.io");
const VehiclePathModel = require("./models/vehiclePath.model");

const port = process.env.PORT;
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

let isStreaming = false; // Flag outside to control multiple streams
// let vehicle = null;

io.on("connection", async (socket) => {
  console.log("Socket connected:", socket.id);
  
  const vehicleNo = "HR55AL5951";
  const chunkSize = 50;
  const interval = 100;

  // Prevent multiple streams on same server
  if (isStreaming) {
    console.log("Streaming already in progress. Ignoring this socket.");
    return;
  }
  isStreaming = false

  try {
    const cursor = VehiclePathModel.find({ vehicleNo }).cursor();
    const totalData = await VehiclePathModel.find({vehicleNo}).countDocuments()
    console.log(totalData)

    let chunk = [];

    const sendChunk = () => {
      if (chunk.length > 0) {
        // console.log(chunk)
        const latlongArray = chunk.map((position) => ({
          lat: parseFloat(position.latitude),
          lng: parseFloat(position.longitude),
          time: position.createdAt,
        }))

        // console.log(latlongArray)
        socket.emit("vehicle-path", latlongArray);
        chunk = [];
      }
    };

    socket.emit("total-path", totalData);

    const streamData = async () => {
      for await (const doc of cursor) {
        chunk.push(doc);

        if (chunk.length >= chunkSize) {
          sendChunk();
          await new Promise((resolve) => setTimeout(resolve, interval));
        }
      }

      sendChunk(); // Send remaining data
      console.log("All data sent, emitting 'No-more'");
      socket.emit("No-more", "no more data");

      isStreaming = false; // Reset the flag when done
    };

    streamData().catch((err) => {
      console.error("Stream error:", err);
      isStreaming = false;
    });
  } catch (error) {
    console.error("Error streaming vehicle path:", error);
    isStreaming = false;
  }

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});

server.listen(port, () => {
  console.log("server is running");
});
