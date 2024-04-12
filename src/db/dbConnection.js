import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

//DB is always on other continent means it always takes time to connect to db so its always very important to use async and await and under try and catch block.
const DB = async () => {
  try {
    const connectDB = await mongoose.connect(
      `${process.env.MONGODB_URL}/${DB_NAME}`
    );
    console.log(`MongoDB connected, DB HOST:  ${connectDB.connection.host}`);
    // in this we r not writing app.on , app.listen . this file is only for database connection.
  } catch (error) {
    console.log("error", error);
    throw error;
  }
};

export default DB; //using default keyword, u can import the passed variable,function or class in other module with anyname u want

//without default keyword:

// export {DB};
