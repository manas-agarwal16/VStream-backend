import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();
console.log(process.env);

// const allowedOrigins = process.env.CORS_ORIGIN.split(",");
const allowedOrigins = ["https://v-stream-fun.vercel.app"];

//.use to configure middelware.
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: "10kb" })); //for incoming requests in jdon format
app.use(express.urlencoded({ extended: true })); // for incoming requests in url
app.use(express.static("public")); //serves static files like html, css, js in public
// app.use(express.static(path.join(__dirname, "public")));

//route import
import userRouter from "./routes/user.routes.js";
import videoRouter from "./routes/video.route.js";
import subscriptionRouter from "./routes/subscription.routes.js";
import playlistRouter from "./routes/playlist.routes.js";
import songsRouter from "./routes/songs.routes.js";

app.get("/", (req, res) => {
  res.status(200).send("Welcome to the VStream");
});

app.use("/api/v1/users", userRouter);
app.use("/api/v1/videos", videoRouter);
app.use("/api/v1/subscription", subscriptionRouter);
app.use("/api/v1/playlist", playlistRouter);
app.use("/api/v1/songs", songsRouter);
export { app };
