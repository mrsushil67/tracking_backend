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
      credentials: true
    }
  });
  

  io.on("connection", async (socket) => {
    console.log("Socket connected:", socket.id);
    const vehicleNo = "HR38Z7163";
    const chunkSize = 100;
    const interval = 10; 
  
    try {
      const cursor = VehiclePathModel.find({ vehicleNo }).cursor();
      let chunk = [];
      
      const sendChunk = () => {
        if (chunk.length > 0) {

            console.log(chunk)
          socket.emit('vehicle-path', chunk);
          chunk = [];
        }
      };
  
      const streamData = async () => {
        for await (const doc of cursor) {
          chunk.push(doc);
  
          if (chunk.length >= chunkSize) {
            sendChunk();
            await new Promise(resolve => setTimeout(resolve, interval));
          }
        }
        sendChunk();
        const str = "no more data";
        socket.emit('No-more', str);
      };
  
      streamData();
    } catch (error) {
      console.error("Error streaming vehicle path:", error);
    }
  
    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
    });
  });
  
server.listen(port, () => {
  console.log("server is running");
});
