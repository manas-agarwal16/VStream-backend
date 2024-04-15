import multer from "multer";

const storage = multer.diskStorage({
  // storing files in disk
  destination: function (req, file, cb) {
    //file parameter contains files uploaded by user
    cb(null, "./public/temp"); //the path is not from multer.middleware.js but from root directory.
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); //although we can update our code to save the files with unique name to avoid overwriting of the files. we can do it by adding addition string in the file name provided by the user randomly.
  },
});

const upload = multer({storage});

export default upload;
