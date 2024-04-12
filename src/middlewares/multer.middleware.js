import multer from "multer";

const storage = multer.diskStorage({
  // storing files in disk
  destination: function (req, file, cb) {
    //file parameter contains files uploaded by user
    cb(null, "../public/temp"); //saving files in ../public/temp folder.
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); //although we can update our code to save the files with unique name to avoid overwriting of the files. we can do it by adding addition string in the file name provided by the user randomly.
  },
});

const upload = multer({ storage: storage });

export default upload;
