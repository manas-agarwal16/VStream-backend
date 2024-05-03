import dotenv from "dotenv"; 
dotenv.config({ path: "../.env" });
import DB from "./db/dbConnection.js";
import {app} from "./app.js";

DB()
  .then(() => {
    app.listen(process.env.PORT || 8000, () => { // on server if process.env.PORT not available then use 8000.
      console.log(`server is running on port : ${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.log("Express cann't connect with database: ", err); 
  });
