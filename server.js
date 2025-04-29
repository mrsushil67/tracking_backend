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

global.io = io

io.on("connection", async (socket) => {
  console.log("Socket connected:", socket.id);
  
  global.socket = socket;

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});

server.listen(port, () => {
  console.log("server is running");
});
