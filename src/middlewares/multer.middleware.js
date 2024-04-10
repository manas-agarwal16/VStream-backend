import multer from "multer";

const storage = multer.diskStorage({
  // storing files in disk
  destination: function (req, file, cb) { //file parameter contains files uploaded by user
    cb(null, "../public/temp"); //saving files in ../public/temp folder.
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); 
  },
});

const upload = multer({ storage: storage });

export default upload;
