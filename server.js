const express = require("express");
const connectDB = require("./backend/config/db");
const dotenv = require("dotenv");
const userRoutes = require("./backend/routes/userRoutes");
const chatRoutes = require("./backend/routes/chatRoutes");
const messageRoutes = require("./backend/routes/messageRoutes");
const { notFound, errorHandler } = require("./backend/middleware/errorMiddleware");
const path = require("path");

dotenv.config();
connectDB();
const app = express();

app.use(express.json()); // to accept json data

// app.get("/", (req, res) => {
//   res.send("API Running!");
// });

app.use("/api/user", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/message", messageRoutes);

// --------------------------deployment------------------------------

const __dirname1 = path.resolve(); // __dirname of backend

if (process.env.NODE_ENV=="production") {
	app.use(express.static(path.join(__dirname1, "frontend", "build")));

	app.get("*", (req, res) =>
		res.sendFile(
			path.resolve(__dirname1,"frontend", "build", "index.html")
		)
	);
} else {
	app.get("/", (req, res) => {
		res.send("API is running..");
	});
}

// --------------------------deployment------------------------------

// Error Handling middlewares
app.use(notFound);
app.use(errorHandler);
console.log("NODE_ENV:", process.env.NODE_ENV);

const PORT = process.env.PORT || 5000;

const server = app.listen(
	PORT,
	console.log(`Server running on PORT ${PORT}...`.yellow.bold)
);

const io = require("socket.io")(server, {
	pingTimeout: 60000,
	cors: {
		origin: "http://localhost:3000",
		// credentials: true,
	},
});

io.on("connection", (socket) => {
	console.log("Connected to socket.io");
	socket.on("setup", (userData) => {
		socket.join(userData._id);
		socket.emit("connected");
	});

	socket.on("join chat", (room) => {
		socket.join(room);
		console.log("User Joined Room: " + room);
	});
	socket.on("typing", (room) => socket.in(room).emit("typing"));
	socket.on("stop typing", (room) => socket.in(room).emit("stop typing"));

	socket.on("new message", (newMessageRecieved) => {
		var chat = newMessageRecieved.chat;

		if (!chat.users) return console.log("chat.users not defined");

		chat.users.forEach((user) => {
			if (user._id == newMessageRecieved.sender._id) return;

			socket.in(user._id).emit("message recieved", newMessageRecieved);
		});
	});

	socket.off("setup", () => {
		console.log("USER DISCONNECTED");
		socket.leave(userData._id);
	});
});
