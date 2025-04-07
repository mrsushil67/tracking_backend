const http = require("http");
const app = require("./app");
require("dotenv").config();
require("./config/dbConnection");
// const { Server } = require("socket.io");
const VehiclePathModel = require("./models/vehiclePath.model");

const port = process.env.PORT;
const server = http.createServer(app);
// const io = new Server(server, {
//   cors: {
//     origin: "http://localhost:5173",
//     methods: ["GET", "POST"],
//     credentials: true,
//   },
// });

// const streamStatusMap = new Map(); // key: socket.id, value: { isStreaming, abortController }

// io.on("connection", async (socket) => {
//   console.log("Socket connected:", socket.id);

//   socket.on("start-stream", async (vehicleNo) => {
//     const chunkSize = 50;
//     const interval = 100;

//     const existingStream = streamStatusMap.get(socket.id);
//     if (existingStream?.isStreaming) {
//       console.log(`Aborting existing stream for socket: ${socket.id}`);
//       existingStream.abortController.abort();
//     }

//     // Setup new controller for this stream
//     const abortController = new AbortController();
//     streamStatusMap.set(socket.id, { isStreaming: true, abortController });

//     try {
//       const cursor = VehiclePathModel.find({ vehicleNo }).cursor();
//       const totalData = await VehiclePathModel.countDocuments({ vehicleNo });

//       console.log(`Total path points: ${totalData}`);
//       socket.emit("total-path", totalData);

//       let chunk = [];

//       const sendChunk = () => {
//         if (chunk.length > 0) {
//           const latlongArray = chunk.map((position) => ({
//             lat: parseFloat(position.latitude),
//             lng: parseFloat(position.longitude),
//             time: position.createdAt,
//           }));
//           socket.emit("vehicle-path", latlongArray);
//           chunk = [];
//         }
//       };

//       const streamData = async () => {
//         for await (const doc of cursor) {
//           // Check if aborted
//           if (abortController.signal.aborted) {
//             console.log(`Stream aborted for socket: ${socket.id}`);
//             break;
//           }

//           chunk.push(doc);

//           if (chunk.length >= chunkSize) {
//             sendChunk();
//             await new Promise((resolve) => setTimeout(resolve, interval));
//           }
//         }

//         if (!abortController.signal.aborted) {
//           sendChunk();
//           socket.emit("No-more", "no more data");
//           console.log("Stream complete for socket:", socket.id);
//         }

//         streamStatusMap.set(socket.id, { isStreaming: false });
//       };

//       streamData().catch((err) => {
//         console.error("Stream error:", err);
//         streamStatusMap.set(socket.id, { isStreaming: false });
//       });
//     } catch (error) {
//       console.error("Error streaming vehicle path:", error);
//       streamStatusMap.set(socket.id, { isStreaming: false });
//     }
//   });

//   socket.on("disconnect", () => {
//     console.log("Socket disconnected:", socket.id);

//     const existingStream = streamStatusMap.get(socket.id);
//     if (existingStream?.isStreaming) {
//       existingStream.abortController.abort(); // cleanup on disconnect
//     }

//     streamStatusMap.delete(socket.id);
//   });
// });

server.listen(port, () => {
  console.log("server is running");
});
