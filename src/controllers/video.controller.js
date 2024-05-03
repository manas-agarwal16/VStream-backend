import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOncloudinary } from "../utils/cloudinary.js";

//clear
const uploadVideo = asyncHandler(async (req, res) => {
  const user = req.user;
  if (!user) {
    throw new ApiError("unauthorized request");
  }

  const { title, description, videoTag } = req.body;
  if (!title || !description || !videoTag) {
    throw new ApiError(401, "All fields require");
  }

  const videoFile = req.files?.videoFile[0].path;
  const thumbnail = req.files?.thumbnail[0].path;

  if (!videoFile) {
    throw new ApiError(401, "video file is require");
  }
  if (!thumbnail) {
    throw new ApiError(401, "thumbnail is require");
  }

  const uploadVideo = await uploadOncloudinary(videoFile);
  if (!uploadVideo) {
    throw new ApiError(501, "error in uploading video to cloudinary");
  }

  const uploadThumbnail = await uploadOncloudinary(thumbnail);
  if (!uploadThumbnail) {
    throw new ApiError(501, "error in uploading thumbnail");
  }

  console.log(uploadVideo);

  const video = new Video({
    owner: user._id,
    videoFile: uploadVideo.url,
    thumbnail: uploadThumbnail.url,
    duration: uploadVideo.duration,
    title,
    description,
    videoTag,
  });

  await video.save().then(() => {
    res.status(201).json(new ApiResponse(201, "video uploaded successfully"));
  });

});


export { uploadVideo };
