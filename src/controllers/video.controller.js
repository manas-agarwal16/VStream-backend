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
import jwt from "jsonwebtoken";

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
    res
      .status(201)
      .json(
        new ApiResponse(201, { video: video }, "video uploaded successfully")
      );
  });
  // await video.save();
});

//clear
const watchVideo = asyncHandler(async (req, res) => {
  let user;

  // console.log("watch video");

  const token =
    req.cookies?.accessToken ||
    req.header("Authorization")?.replace("Bearer ", "");

  // console.log("token : ", token);

  if (token) {
    const decodedToken = await jwt.verify(token, process.env.ACCESS_TOKEN_KEY);

    if (!decodedToken) {
      throw new ApiError(501, "error in decodeding token");
    }

    user = await User.findOne({ _id: decodedToken._id }).select(
      "-password -refreshToken"
    );
  }

  const { video_id } = req.params;
  // console.log("video_id : ", video_id);

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

  // console.log("user : ", user);

  let viewed;

  if (user) {
    viewed = await Views.findOne({
      user_id: user._id,
      video_id: video._id,
    });
  }

  let requiredVideo = video;
  let currentViews = video.views;
  if (user) {
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
  }

  if (!requiredVideo) {
    throw new ApiError(501, "error in fetching video");
  }

  if (user) {
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
  }

  const ownerDetails = await User.findOne({
    _id: video.owner,
  });

  let likes = await Likes.find({ model_id: video_id, modelName: "video" });
  let subscribers = await Subscription.find({ subscribeTo: video.owner });

  let isSubscribed = false,
    isLiked = false;

  if (user) {
    isSubscribed = await Subscription.findOne({
      subscribeTo: ownerDetails._id,
      subscriber: user._id,
    });
    isLiked = await Likes.findOne({
      model_id: video_id,
      modelName: "video",
      user_id: user._id,
    });

    if (isLiked) {
      isLiked = true;
    } else {
      isLiked = false;
    }

    if (isSubscribed) {
      isSubscribed = true;
    } else isSubscribed = false;
  }
  subscribers = subscribers.length;
  likes = likes.length;

  video = video.toObject();

  // console.log("video prev : " , video);

  video = {
    ...video,
    avatar: ownerDetails.avatar,
    likes,
    subscribers,
    isLiked,
    isSubscribed,
  };

  // console.log("watch video : ", video);

  res
    .status(201)
    .json(new ApiResponse(201, video, "video fetched successfully"));
});

//clear
const toggleVideoLike = asyncHandler(async (req, res) => {
  // console.log("toggleVideolike");
  const user = req.user;
  if (!user) {
    throw new ApiError(401, "Invalid request");
  }
  const { video_id } = req.body;
  // console.log("video_id : ", video_id);

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

  let userLiked = null;

  if (!liked) {
    userLiked = true;
    const likeVideo = await new Likes({
      user_id: user._id,
      model_id: video_id,
      modelName: "video",
    });
    await likeVideo.save();
  } else {
    userLiked = false;
    await Likes.findOneAndDelete({
      user_id: user._id,
      model_id: video_id,
      modelName: "video",
    });
  }

  // console.log("userLiked : " , userLiked);

  let videoLikes = await Likes.find({ model_id: video_id, modelName: "video" });
  videoLikes = { video_id, likes: videoLikes.length, isLiked: userLiked };

  // console.log();

  res
    .status(201)
    .json(new ApiResponse(201, videoLikes, "Your like marked successfully"));
});

//clear
const getVideos = asyncHandler(async (req, res) => {
  // console.log("here");

  const page = parseInt(req.query.page) || 1;
  const limit = 6;
  const skip = (page - 1) * limit;

  const paginationVideos = await Video.aggregate([
    {
      $sort: { updatedAt: -1 },
    },
    {
      $skip: skip, //skips the first n documents.
    },
    {
      $limit: limit,
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerDetails",
      },
    },
  ]);

  // console.log("videos backend : ", paginationVideos);

  setTimeout(() => {
    res
      .status(200)
      .json(
        new ApiResponse(
          201,
          { videos: paginationVideos },
          "videos fetched successfully"
        )
      );
  }, 500);
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

  // console.log("content : ", content);
  console.log("video_id : ", video_id);

  if (!content) {
    throw new ApiError(401, "Comment content is required");
  }

  if (!(video_id || parentComment_id)) {
    throw new ApiError(401, "video_id or parentCommentId is required");
  }

  if (video_id) {
    try {
      const exists = await Video.findById(video_id);
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

  // console.log("user  : ", user);

  const newComment = new Comment({
    user_id: user._id,
    content,
    video_id,
    parentComment_id,
  });
  await newComment.save();

  let comment = newComment.toObject();
  comment = {
    ...comment,
    isLiked: false,
    likes: 0,
    username: user.username,
    avatar: user.avatar,
  };

  console.log("comment : ", comment);

  res
    .status(201)
    .json(new ApiResponse(201, comment, "Your comment marked successfully"));
});

const editComment = asyncHandler(async (req, res) => {
  const user = req.user;
  const { comment, comment_id } = req.body;
  if (!comment || !comment_id) {
    throw new ApiError(501, "comment and comment_id are required");
  }
  try {
    const updatedComment = await Comment.findOneAndUpdate(
      { _id: comment_id, user_id: user._id },
      { content: comment },
      { new: true }
    );

    if (updatedComment) {
      res
        .status(200)
        .json(
          new ApiResponse(
            201,
            updatedComment,
            "Comment updated successfully!!!"
          )
        );
    }
  } catch (error) {
    throw new ApiError(501, "Error in updating comment");
  }
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const user = req.user;
  if (!user) {
    throw new ApiError(401, "Unauthorized Request");
  }
  let { oldComment } = req.body;
  if (!oldComment) {
    throw new ApiError(401, "comment_id is required");
  }

  try {
    const exists = await Comment.findOne({ _id: oldComment._id });
    if (!exists) {
      throw new ApiError(401, "Invalid comment");
    }
  } catch (error) {
    throw new ApiError(401, "invalid comment", error);
  }

  if (oldComment.isLiked) {
    await Likes.findOneAndDelete({
      user_id: user._id,
      model_id: oldComment._id,
      modelName: "comment",
    });
    oldComment.likes -= 1;
    oldComment.isLiked = false;
    res
      .status(201)
      .json(
        new ApiResponse(201, oldComment, "Toggle comment like successfully")
      );
  } else {
    const newLike = new Likes({
      user_id: user._id,
      model_id: oldComment._id,
      modelName: "comment",
    });

    await newLike.save();

    oldComment.isLiked = true;
    oldComment.likes += 1;
    res
      .status(201)
      .json(
        new ApiResponse(201, oldComment, "Toggle comment like successfully")
      );
  }
});

//clear
const deleteComment = asyncHandler(async (req, res) => {
  const user = req.user;

  const { comment_id } = req.params;

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

  console.log("deletedComment : ", deleteComment);

  res
    .status(201)
    .json(new ApiResponse(201, deleteComment, "comment deleted successfully"));
});

//clear
const getComments = asyncHandler(async (req, res) => {
  let user;

  const token =
    req.cookies?.accessToken ||
    req.header("Authorization")?.replace("Bearer ", "");

  if (token) {
    //collecting data from data by decoding it. .verify() function to decode token.
    const decodedToken = await jwt.verify(token, process.env.ACCESS_TOKEN_KEY);

    if (!decodedToken) {
      throw new ApiError(501, "error in decodeding token");
    }

    user = await User.findOne({ _id: decodedToken._id }).select(
      "-password -refreshToken"
    );
  }

  let { video_id, parentComment_id } = req.query;

  console.log("video_id : ", video_id);

  if (parentComment_id) {
    const childComments = await Comment.aggregate([
      {
        $match: {
          parentComment_id: new mongoose.Types.ObjectId(parentComment_id),
        },
      },
      {
        $lookup: {
          from: "likes",
          localField: "_id",
          foreignField: "model_id",
          as: "likes",
        },
      },
      {
        $addFields: {
          likes: { $size: "$likes" },
        },
      },
    ]);
    // console.log(childComments);
    if (childComments.length === 0) {
      res.status(201).json(new ApiResponse(201, "No comments yet"));
    } else {
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
  } else if (video_id) {
    // const videoComments = await Comment.find({ video_id });
    let videoComments = await Comment.aggregate([
      {
        $match: {
          video_id: new mongoose.Types.ObjectId(video_id),
        },
      },
      {
        $sort: { updatedAt: -1 },
      },
      {
        $lookup: {
          from: "likes",
          localField: "_id",
          foreignField: "model_id",
          as: "likes",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "user_id",
          foreignField: "_id",
          as: "owner",
        },
      },
      {
        $unwind: "$owner",
      },
      {
        $addFields: {
          likes: { $size: "$likes" },
        },
      },
      {
        $project: {
          username: "$owner.username",
          avatar: "$owner.avatar",
          likes: "$likes",
          content: "$content",
        },
      },
    ]);

    const totalComments = (await Comment.find({ video_id })).length;

    // console.log("videoComments : ", videoComments);

    videoComments = await Promise.all(
      videoComments.map(async (comment) => {
        const isLiked = await Likes.findOne({
          user_id: user._id,
          model_id: comment._id,
          modelName: "comment",
        });
        return { ...comment, isLiked: !!isLiked }; // Add isLiked as a boolean
      })
    );

    // videoComments = { ...videoComments, totalComments };

    console.log("getcomments  : ", videoComments);
    console.log("totalComments : ", totalComments);

    setTimeout(() => {
      res.status(201).json(
        new ApiResponse(
          201,
          // { comments: videoComments },
          { videoComments, totalComments },
          "comments fetched successfully"
        )
      );
    }, 500);
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
  let thumbnail = req.files?.thumbnail[0].path;
  let videoFile = req.files?.videoFile[0].path;

  if (!thumbnail || !videoFile) {
    throw new ApiError(
      401,
      "All fields required. Thumbnail / videoFile are missing"
    );
  }
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
    const video = await Video.findOne({ _id: video_id, owner: user._id });
    if (!video) {
      throw new ApiError(401, "Invalid request or video_id does not exists");
    }
  } catch (error) {
    throw new ApiError(
      401,
      "Invalid video_id. no such video exists with this id"
    );
  }

  const uploadVideo = await uploadOncloudinary(videoFile);
  if (!uploadVideo) {
    throw new ApiError(501, "error in uploading video to cloudinary");
  }

  const uploadThumbnail = await uploadOncloudinary(thumbnail);
  if (!uploadThumbnail) {
    throw new ApiError(501, "error in uploading thumbnail");
  }

  const updateVideo = await Video.findOneAndUpdate(
    { _id: video_id, owner: user._id },
    {
      title: title,
      description: description,
      videoTag: videoTag,
      thumbnail: uploadThumbnail.url,
      videoFile: uploadVideo.url,
    },
    { new: true }
  );

  if (!updateVideo) {
    throw new ApiError(501, "error in updating video");
  }

  res
    .status(201)
    .json(new ApiResponse(201, updateVideo, "video updated successfully"));
});

export {
  uploadVideo,
  watchVideo,
  toggleVideoLike,
  getVideos,
  search,
  comment,
  editComment,
  toggleCommentLike,
  getComments,
  likedVideos,
  deleteComment,
  myVideos,
  updateVideoDetails,
  deleteVideo,
};
