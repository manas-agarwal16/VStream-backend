//if anychanges made to env file , package.json file , u have to restart ur server, nodemon cann't do it.

//look at package.json "start" the added code is necessary for dotenv to work with ES6 JS. src/index.js so index.js inside src directory is executed on npm start.
import dotenv from "dotenv"; // this is how u import dotenv require will not work for ES6 JS.
dotenv.config({ path: "../env" });
import DB from "./db/db.js";

DB(); //after importing DB from db/db.js we r calling it to connect to the db

/*
OR 
//Using IIFI coz we want our db to connect as soon as possible so immediately invoking our function.
(async () => {
  try {
    const connectDB = await mongoose.connect(
      `${process.env.MONGODB_URL}/${DB_NAME}`
    );
    app.on("error", (error) => {
      console.log(
        "db is connected but express cann't communicate with it",
        error
      );
      throw error;
    });
    app.listen(process.env.PORT, () => {
      console.log(`server running on port ${process.env.PORT}`);
    });
  } catch (error) {
    console.log("Error: ", error);
    throw error;
  }
})();
*/
