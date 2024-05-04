import { User } from "../models/users.model.js";
import { Video } from "../models/videos.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOncloudinary } from "../utils/cloudinary.js";
import { Views } from "../models/views.model.js";
import { Likes } from "../models/likes.model.js";
import { Subscription } from "../models/subscriptions.model.js";

//clear
const uploadVideo = asyncHandler(async (req, res) => {
  const user = req.user;
  if (!user) {
    throw new ApiError("unauthorized request");
  }

  let { title, description, videoTag } = req.body;
  if (!title || !description || !videoTag) {
    //dropdown for videoTag
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

//clear
const watchVideo = asyncHandler(async (req, res) => {
  const user = req.user;
  if (!user) {
    throw new ApiError(401, "Invalid request");
  }

  const { video_id } = req.body;
  if (!video_id) {
    throw new ApiError(401, "video_id is required");
  }
  const video = await Video.findById({ _id: video_id });
  if (!video) {
    throw new ApiError(
      401,
      "Video currently not available or invalid video file"
    );
  }

  const viewed = await Views.findOne({
    user_id: user._id,
    video_id: video._id,
  });

  let requiredVideo = video;
  let currentViews = video.views;
  if (!viewed) {
    currentViews += 1;
    requiredVideo = await Video.findByIdAndUpdate(
      { _id: video_id },
      { views: currentViews },
      { new: true }
    );

    const viewVideo = new Views({
      user_id: user._id,
      video_id: video_id,
    });

    await viewVideo
      .save()
      .then(() => {
        console.log("views updated successfully");
      })
      .catch((err) => {
        throw new ApiError(501, "error in updating views", err);
      });
  }

  if (!requiredVideo) {
    throw new ApiError(501, "error in fetching video");
  }

  const watchHistory = user.watchHistory;
  watchHistory.unshift(requiredVideo._id);
  if (watchHistory.length > 10) {
    watchHistory.pop();
  }

  const updateWatchHistory = await User.findByIdAndUpdate(
    { _id: user._id },
    { watchHistory: watchHistory },
    { new: true }
  );

  if (!updateWatchHistory) {
    throw new ApiError(501, "error in updating watch history");
  }

  let likes = await Likes.find({ video_id: video_id });
  let subscribers = await Subscription.find({ channel: video.owner });

  subscribers = subscribers.length;
  likes = likes.length;
  res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { video: requiredVideo, likes: likes, subscribers: subscribers },
        "video fetched successfully"
      )
    );
});

//clear
const likeVideo = asyncHandler(async (req, res) => {
  const user = req.user;
  if (!user) {
    throw new ApiError(401, "Invalid request");
  }
  const { video_id } = req.body;
  if (!video_id) {
    throw new ApiError(401, "video_id is required");
  }
  const liked = await Likes.findOne({
    user_id: user._id,
    video_id: video_id,
  });

  if (!liked) {
    const likeVideo = new Likes({
      user_id: user._id,
      video_id: video_id,
    });
    await likeVideo
      .save()
      .then(() => {
        console.log("Video liked successfully");
      })
      .catch((err) => {
        throw new ApiError(501, "error in saving like");
      });
  }

  let likes = await Likes.find({ video_id: video_id });
  likes = likes.length;
  res
    .status(201)
    .json(new ApiResponse(201, { likes }, "Your like marked successfully"));
});

//clear
const unlikeVideo = asyncHandler(async (req, res) => {
  const user = req.user;
  if (!user) {
    throw new ApiError(401, "Invalid request");
  }
  const { video_id } = req.body;
  if (!video_id) {
    throw new ApiError(401, "video_id is required");
  }
  const liked = await Likes.findOne({ user_id: user._id, video_id: video_id });
  if (liked) {
    const deleteLike = await Likes.findOneAndDelete({
      user_id: user._id,
      video_id: video_id,
    });
    if (!deleteLike) {
      throw new ApiError(501, "error in deleting likes");
    }
  }
  let likes = await Likes.find({ user_id: user._id, video_id: video_id });
  likes = likes.length;
  res
    .status(201)
    .json(new ApiResponse(201, { likes: likes }, "U have unlike the video"));
});

export { uploadVideo, watchVideo, likeVideo, unlikeVideo };
