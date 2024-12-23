import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";

const app = express();

const allowedOrigins = process.env.CORS_ORIGIN.split(",");

//.use to configure middelware.
app.use(
  cors({
    origin: function (origin, callback) {
      if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
        callback(null, true); // Allow the request
      } else {
        callback(new Error("Not allowed by CORS")); // Block the request
      }
    },
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
