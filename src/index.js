require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const fileUpload = require("express-fileupload");
const app = express();

const origin = process.env.ORIGIN || "http://localhost:5173";

//middle wares
app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: "/tmp/",
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  })
);
app.use(
  cors({
    origin: [
      origin,
      "http://localhost:5174",
      "https://ccg-game-app.netlify.app",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

//mongoose setup
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));

//routes
const UserRoute = require("./routes/user.route");
const AdminRoute = require("./routes/admin.route");
const GameRoute = require("./routes/game.route");

app.get("/", (req, res) => {
  return res.status(200).json({
    status: true,
    message: "Game Server is Running",
  });
});

app.use("/api/user", UserRoute);
app.use("/api/admin", AdminRoute);
app.use("/api/game", GameRoute);

//server startup
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
