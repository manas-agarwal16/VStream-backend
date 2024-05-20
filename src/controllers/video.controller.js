import { User } from "../models/users.model.js";
import { Video } from "../models/videos.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  deleteFileFromCloudinary,
  uploadOncloudinary,
} from "../utils/cloudinary.js";
import { Views } from "../models/views.model.js";
import { Likes } from "../models/likes.model.js";
import { Subscription } from "../models/subscriptions.model.js";
import { Comment } from "../models/comment.model.js";
import mongoose from "mongoose";
import { public_id } from "../utils/public_id.js";
import { Song } from "../models/song.model.js";

const tagOptions = [
  "games",
  "learning",
  "music",
  "comedy",
  "news",
  "serials",
  "others",
];

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
  videoTag = videoTag.toLowerCase();

  if (!tagOptions.includes(videoTag)) {
    throw new ApiError(401, "Invalid Video Tag");
  }

  // console.log(req.files);
  const videoFile = req.files?.videoFile[0].path;
  if (videoFile.includes(".mp3")) {
    throw new ApiError(
      401,
      "Video file is expected. Instead  received a song file"
    );
  }
  const thumbnail = req.files?.thumbnail[0]?.path;
  console.log(videoFile, thumbnail);

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
    username: user.username,
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
  let video;
  try {
    video = await Video.findById({ _id: video_id });
    if (!video) {
      throw new ApiError(401, "invalid video file");
    }
  } catch (error) {
    throw new ApiError(401, "invalid video file", error);
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

    await viewVideo.save();
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

  let likes = await Likes.find({ model_id: video_id, modelName: "video" });
  let subscribers = await Subscription.find({ subscribeTo: video.owner });

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

  try {
    const exists = await Video.findOne({ _id: video_id });
    if (!exists) {
      throw new ApiError(401, "invalid video_id");
    }
  } catch (error) {
    throw new ApiError(401, "invalid video_id");
  }

  const liked = await Likes.findOne({
    user_id: user._id,
    model_id: video_id,
    modelName: "video",
  });

  if (!liked) {
    const likeVideo = new Likes({
      user_id: user._id,
      model_id: video_id,
      modelName: "video",
    });
    await likeVideo.save();
  }

  let likes = await Likes.find({ model_id: video_id, modelName: "video" });
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
  try {
    const exists = await Video.findOne({ _id: video_id });
    if (!exists) {
      throw new ApiError(401, "invalid video_id");
    }
  } catch (error) {
    throw new ApiError(401, "invalid video_id");
  }

  const liked = await Likes.findOne({
    user_id: user._id,
    model_id: video_id,
    modelName: "video",
  });

  if (liked) {
    const deleteLike = await Likes.findOneAndDelete({
      user_id: user._id,
      model_id: video_id,
      modelName: "video",
    });

    if (!deleteLike) {
      throw new ApiError(501, "error in deleting likes");
    }
  }
  let likes = await Likes.find({
    user_id: user._id,
    model_id: video_id,
    modelName: "video",
  });

  likes = likes.length;
  res
    .status(201)
    .json(new ApiResponse(201, { likes: likes }, "U have unlike the video"));
});

//clear
const getVideos = asyncHandler(async (_, res) => {
  const videos = await Video.find();
  let nineVideo = [];
  if (videos.length > 9) {
    for (let i = 1; i <= 9; i++) {
      const index = Math.floor(Math.random() * 9);
      const doc = videos[index];
      if (nineVideo.includes(doc)) {
        i--;
      } else {
        nineVideo.push(doc);
      }
    }
  } else {
    nineVideo = videos;
  }
  res
    .status(201)
    .json(
      new ApiResponse(201, { videos: nineVideo }, "videos fetched successfully")
    );
});

//clear , Remember : mention in the frontend that ur video title video tag and ur description helps user to find ur video through search.
const search = asyncHandler(async (req, res) => {
  const { search } = req.query;
  if (!search) {
    return res
      .status(201)
      .json(
        new ApiResponse(401, "search what you want to see 😊. Enjoy your day")
      );
  }
  const videos = await Video.find({
    $or: [
      { title: { $regex: search, $options: "i" } }, //regex for regular expression, i for case insensitivity
      { videoTag: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
      { username: { $regex: search, $options: "i" } },
    ],
  });
  if (videos.length === 0) {
    res
      .status(201)
      .json(
        new ApiResponse(201, "Sorry, your search did not match any documents")
      );
  }
  res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { videos },
        "videos with related search fetched successfully"
      )
    );
});

//clear
const comment = asyncHandler(async (req, res) => {
  const user = req.user;
  if (!user) {
    throw new ApiError(401, "Invalid request");
  }
  const { content, video_id, parentComment_id } = req.body; //parentComment_id null if video comment
  if (!content) {
    throw new ApiError(401, "Comment content is required");
  }

  if (!(video_id || parentComment_id)) {
    throw new ApiError(401, "video_id or parentCommentId is required");
  }

  if (video_id) {
    try {
      const exists = await Video.findById({ _id: video_id });
      if (!exists) {
        throw new ApiError(401, "Invalid video_id");
      }
    } catch (error) {
      throw new ApiError(401, "Invalid video_id");
    }
  }

  if (parentComment_id) {
    try {
      const commentIdExists = await Comment.findById({ _id: parentComment_id });
      if (!commentIdExists) {
        throw new ApiError(401, "Invalid parentCommentId");
      }
    } catch (error) {
      throw new ApiError(401, "Invalid parentCommentId");
    }
  }

  const newComment = new Comment({
    user_id: user._id,
    content,
    video_id,
    parentComment_id,
  });
  await newComment
    .save()
    .then(() => {
      res
        .status(201)
        .json(new ApiResponse(201, "Your comment marked successfully"));
    })
    .catch((err) => {
      throw new ApiError(501, "error in saving comment", err);
    });
});

const likeComment = asyncHandler(async (req, res) => {
  const user = req.user;
  const { comment_id } = req.body;
  if (!comment_id) {
    throw new ApiError(401, "invalid comment_id");
  }

  try {
    const exists = await Comment.findOne({ _id: comment_id });
    if (!exists) {
      throw new ApiError(401, "Invalid comment_id");
    }
  } catch (error) {
    throw new ApiError(401, "invalid comment_id", error);
  }

  const alreayLiked = await Likes.findOne({
    user_id: user._id,
    model_id: comment_id,
    modelName: "comment",
  });
  if (alreayLiked) {
    return res
      .status(201)
      .json(new ApiResponse(201, "You have already liked this video"));
  }

  const newLike = new Likes({
    user_id: user._id,
    model_id: comment_id,
    modelName: "comment",
  });

  await newLike.save();

  return res
    .status(201)
    .json(
      new ApiResponse(201, "your like on this comment marked successfully")
    );
});

//clear
const deleteComment = asyncHandler(async (req, res) => {
  const user = req.user;

  const { comment_id } = req.body;

  console.log(comment_id);

  if (!comment_id) {
    throw new ApiError(401, "comment_id required");
  }
  try {
    const exists = await Comment.findOne({
      _id: comment_id,
      user_id: user._id,
    });
    if (!exists) {
      throw new ApiError(401, "Invalid request or comment_id");
    }
  } catch (error) {
    throw new ApiError(401, "Invalid request or comment_id");
  }

  const childrenComments = await Comment.find({ parentComment_id: comment_id });

  for (let i = 0; i < childrenComments.length; i++) {
    const del = await Comment.findOneAndDelete({ _id: childrenComments[i] });
    if (!del) {
      throw new ApiError(501, "error in deleting child comment");
    }
  }

  const deleteComment = await Comment.findOneAndDelete({
    _id: comment_id,
    user_id: user._id,
  });
  if (!deleteComment) {
    throw new ApiError(501, "error in deleting comment");
  }
  res.status(201).json(new ApiResponse(201, "comment deleted successfully"));
});

//clear
const getComments = asyncHandler(async (req, res) => {
  const { video_id, parentComment_id } = req.body;
  if (parentComment_id) {
    const childComments = await Comment.aggregate([
      {
        $match : {
          parentComment_id : new mongoose.Types.ObjectId(parentComment_id),
        }
      },
      {
        $lookup : {
          from : "likes",
          localField : "_id",
          foreignField : "model_id",
          as : "likes"
        }
      },
      {
        $addFields : {
          likes : {$size : "$likes"}
        }
      }
    ]);
    console.log(childComments);
    if (childComments.length === 0) {
      res.status(201).json(new ApiResponse(201, "No comments yet"));
    }
    else {

      res
        .status(201)
        .json(
          new ApiResponse(
            201,
            { comments: childComments },
            "comments fetched successfully"
          )
        );
    }
  } 
  else if (video_id) {
    // const videoComments = await Comment.find({ video_id });
    const videoComments = await Comment.aggregate([
      {
        $match : {
          video_id : new mongoose.Types.ObjectId(video_id)
        }
      },
      {
        $lookup : {
          from : "likes",
          localField : "_id",
          foreignField : "model_id",
          as : "likes"
        }
      },
      {
        $addFields : {
          likes : {$size : "$likes"}
        }
      }
    ])
    if (videoComments.length === 0) {
      res.status(201).json(new ApiResponse(201, "No comments yet"));
    } else {
      res
        .status(201)
        .json(
          new ApiResponse(
            201,
            { comments: videoComments },
            "comments fetched successfully"
          )
        );
    }
  } else {
    throw new ApiError(401, "video_id or parentComment_id is required");
  }
});

//clear
const likedVideos = asyncHandler(async (req, res) => {
  const user = req.user;
  if (!user) {
    throw new ApiError(401, "Invalid request");
  }
  const videos = await Likes.aggregate([
    {
      $match: {
        user_id: new mongoose.Types.ObjectId(user._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "model_id",
        foreignField: "_id",
        as: "Videos",
      },
    },
    {
      $unwind: "$Videos",
    },
    {
      $group: {
        _id: "$user_id",
        likedVideos: { $push: "$Videos" },
      },
    },
  ]);
  if (videos.length === 0) {
    res
      .status(201)
      .json(new ApiResponse(201, "You haven't liked any videos yet"));
  } else {
    res
      .status(201)
      .json(
        new ApiResponse(201, videos[0], "liked videos fetched successfully")
      );
  }
});

//clear
const getVideosByTag = asyncHandler(async (req, res) => {
  let { tag } = req.body;
  if (!tag) {
    throw new ApiError(401, "tag is required");
  }

  const videos = await Video.find({
    $or: [
      { videoTag: { $regex: tag, $options: "i" } },
      { username: { $regex: tag, $options: "i" } },
      { title: { $regex: tag, $options: "i" } },
      { description: { $regex: tag, $options: "i" } },
    ],
  });

  if (videos.length === 0) {
    return res
      .status(201)
      .json(new ApiResponse(201, "Sorry we dont related videos with this tag"));
  }
  return res
    .status(201)
    .json(new ApiResponse(201, videos, "videos fetched successfully"));
});

//clear
const myVideos = asyncHandler(async (req, res) => {
  const user = req.user;
  const videos = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(user._id),
      },
    },
    {
      $sort: { createdAt: -1 },
    },
  ]);
  console.log(videos);
  if (videos.length === 0) {
    return res.status(201).json(new ApiResponse(201, "You haven't posted yet"));
  }

  return res
    .status(201)
    .json(new ApiResponse(201, videos, "videos fetched succesfully"));
});

//clear
const deleteVideo = asyncHandler(async (req, res) => {
  const user = req.user;
  const { video_id } = req.body;
  if (!video_id) {
    throw new ApiError(401, "video_id is required");
  }

  try {
    const exists = await Video.findOne({ _id: video_id });
    if (!exists) {
      throw new ApiError(
        401,
        "Invalid video_id. no such video exists with this id"
      );
    }
  } catch (error) {
    throw new ApiError(
      401,
      "Invalid video_id. no such video exists with this id"
    );
  }

  const video = await Video.findOne({ _id: video_id, owner: user._id });
  if (!video) {
    throw new ApiError(401, "Invalid request");
  }

  const videoFile = video.videoFile;
  const thumbnail = video.thumbnail;

  const videoFilePublic_id = public_id(videoFile);
  const thumbnailPublic_id = public_id(thumbnail);

  try {
    const deleteVideoCloudinary =
      await deleteFileFromCloudinary(videoFilePublic_id);
    if (!deleteFileFromCloudinary) {
      throw new ApiError(501, "error in deleting video from cloudinary");
    }
  } catch (error) {
    throw new ApiError(501, "error in deleting video from cloudinary", error);
  }

  try {
    const deleteThumbnailCloudinary =
      await deleteFileFromCloudinary(thumbnailPublic_id);
    if (!deleteThumbnailCloudinary) {
      throw new ApiError(501, "error in deleting thumbnail from cloudinary");
    }
  } catch (error) {
    throw new ApiError(
      501,
      "error in deleting thumbnail from cloudinary",
      error
    );
  }

  const deleteVideo = await Video.findOneAndDelete({
    _id: video_id,
    owner: user._id,
  });
  if (!deleteVideo) {
    throw new ApiError(501, "error in deleting video");
  }

  res
    .status(201)
    .json(new ApiResponse(201, deleteVideo, "video deleted successfully"));
});

//clear
const updateVideoDetails = asyncHandler(async (req, res) => {
  const user = req.user;
  let { video_id, title, description, videoTag } = req.body;
  if (!video_id) {
    throw new ApiError(401, "video_id is required");
  }

  if (!title || !description || !videoTag) {
    throw new ApiError(401, "all fields required");
  }

  videoTag = videoTag.toLowerCase();

  if (!tagOptions.includes(videoTag)) {
    throw new ApiError(401, "invalid videoTag");
  }

  try {
    const exists = await Video.findOne({ _id: video_id });
    if (!exists) {
      throw new ApiError(
        401,
        "Invalid video_id. no such video exists with this id"
      );
    }
  } catch (error) {
    throw new ApiError(
      401,
      "Invalid video_id. no such video exists with this id"
    );
  }

  const video = await Video.findOne({ _id: video_id, owner: user._id });
  if (!video) {
    throw new ApiError(401, "invalid request");
  }

  const updateVideo = await Video.findOneAndUpdate(
    { _id: video_id, owner: user._id },
    { title: title, description: description, videoTag: videoTag },
    { new: true }
  );

  if (!updateVideo) {
    throw new ApiError(501, "error in updating video");
  }

  res
    .status(201)
    .json(new ApiResponse(201, updateVideo, "video updated successfully"));
});

//clear
const updateThumbnail = asyncHandler(async (req, res) => {
  const user = req.user;
  const { video_id } = req.body;
  const thumbnail = req.files?.thumbnail[0].path;
  console.log(thumbnail);
  if (!video_id) {
    throw new ApiError(401, "video_id is required");
  }
  if (!thumbnail) {
    throw new ApiError(401, "thumbnail is requried");
  }

  try {
    const exists = await Video.findById({ _id: video_id });
    if (!exists) {
      throw new ApiError(
        401,
        "invalid video_id. no such video exists with this id"
      );
    }
  } catch (error) {
    throw new ApiError(
      401,
      "Invalid video_idinvalid video_id. no such video exists with this id"
    );
  }

  const video = await Video.findOne({ _id: video_id, owner: user._id });
  if (!video) {
    throw new ApiError("Invalid request to update the video");
  }

  let thumbnailPublic_id;
  try {
    thumbnailPublic_id = public_id(video.thumbnail);
    console.log(thumbnailPublic_id);
    const deleteOldThumbnail =
      await deleteFileFromCloudinary(thumbnailPublic_id);
    if (!deleteFileFromCloudinary) {
      throw new ApiError(501, "error in deleting thumbnail from cloudinary");
    }
  } catch (error) {
    console.log(thumbnailPublic_id);
    throw new ApiError(
      501,
      "error in deleting thumbnail from cloudinary",
      error
    );
  }

  let thumbnailUpload;
  try {
    thumbnailUpload = await uploadOncloudinary(thumbnail);
    if (!thumbnail) {
      throw new ApiError(501, "error in uploading thumbnail to cloudinary");
    }
  } catch (error) {
    throw new ApiError(501, "error in uploading thumbnail to cloudinary");
  }

  const updateThumbnailVideo = await Video.findOneAndUpdate(
    { _id: video_id, owner: user._id },
    { thumbnail: thumbnail.url },
    { new: true }
  );

  if (!updateThumbnail) {
    throw new ApiError(501, "error in updating thumbnail");
  }

  res
    .status(201)
    .json(
      new ApiResponse(
        201,
        updateThumbnailVideo,
        "video thumbnail updated successfully"
      )
    );
});

export {
  uploadVideo,
  watchVideo,
  likeVideo,
  unlikeVideo,
  getVideos,
  search,
  comment,
  getComments,
  likedVideos,
  deleteComment,
  getVideosByTag,
  myVideos,
  updateThumbnail,
  updateVideoDetails,
  deleteVideo,
};
