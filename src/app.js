import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

//.use to configure middelware.
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

app.use(express.json({limit : "10kb"}));//for incoming requests in jdon format
app.use(express.urlencoded({extended: true})) // for incoming requests in url
app.use(express.static("Public"));//serves static files like html, css, js in public directory

export {app} ;