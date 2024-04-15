import dotenv from "dotenv"; // this is how u import dotenv require will not work for ES6 JS.
dotenv.config({ path: "../.env" });
import DB from "./db/dbConnection.js";
import {app} from "./app.js";

//after importing DB from db/db.js we r calling it to connect to the db
DB()
  .then(() => {
    app.listen(process.env.PORT || 8000, () => { // on server if process.env.PORT not available then use 8000.
      console.log(`server is running on port : ${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.log("Express cann't connect with database: ", err); 
  });
