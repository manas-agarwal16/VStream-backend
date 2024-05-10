import { User } from "../models/users.model.js";
import { Video } from "../models/videos.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOncloudinary } from "../utils/cloudinary.js";
import { Views } from "../models/views.model.js";
import { Likes } from "../models/likes.model.js";
import { Subscription } from "../models/subscriptions.model.js";
import { Comment } from "../models/comment.model.js";
import mongoose from "mongoose";

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

//clear , Remember : mention in the frontend that ur video title video tag and ur description helps user to find ur vidio through search.
const search = asyncHandler(async (req, res) => {
  const { search } = req.query;
  const videos = await Video.find({
    $or: [
      { title: { $regex: search, $options: "i" } }, //regex for regular expression
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
  const { content, video_id, parentComment_id } = req.body;
  if (!content) {
    throw new ApiError(401, "Comment content is required");
  }

  if (!(video_id || parentComment_id)) {
    throw new ApiError(401, "video_id or parentComment_id is required");
  }

  const newComment = new Comment({
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

//clear
const getComments = asyncHandler(async (req, res) => {
  const { video_id, parentComment_id } = req.body;
  if (parentComment_id) {
    const childComments = await Comment.find({ parentComment_id });
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
    const videoComments = await Comment.find({ video_id });

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
        localField: "video_id",
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
const subscribe = asyncHandler(async (req, res) => {
  const user = req.user;
  const { username } = req.body; //frontend- username = channel
  if (!username) {
    throw new ApiError(401, "video_id is required");
  }

  const subscribeTo = await User.findOne({ username });
  if (!subscribeTo) {
    throw new ApiError(401, "No such channel exists");
  }

  const subscribed = await Subscription.findOne({
    subscriber: user._id,
    subscribeTo: subscribeTo._id,
  });

  if (subscribed) {
    res
      .status(201)
      .json(new ApiResponse(201, "You have already subscribed this channel"));
  }

  const subscribeChannel = new Subscription({
    subscribeTo: subscribeTo._id,
    subscriber: user._id,
  });
  await subscribeChannel
    .save()
    .then(() => {
      res
        .status(201)
        .json(new ApiResponse(201, `You have subscribed ${username}`));
    })
    .catch((err) => {
      throw new ApiError(501, "error in subscribing user");
    });
});

//clear
const unSubscribe = asyncHandler(async (req, res) => {
  const user = req.user;
  const { username } = req.body;
  if (!username) {
    throw new ApiError(401, "username is requred");
  }

  const userToUnsubscribe = await User.findOne({ username });
  if (!userToUnsubscribe) {
    throw new ApiError(401, "no such username found");
  }

  const deleteSubscription = await Subscription.findOneAndDelete({
    subscriber: user._id,
    subscribeTo: userToUnsubscribe._id,
  });

  console.log(deleteSubscription);
  if (!deleteSubscription) {
    throw new ApiError(501, "error in deleting subscription");
  }
  res
    .status(201)
    .json(new ApiResponse(201, `You have unsubscribed ${username}.`));
});

const subscriptionChannels = asyncHandler(async (req, res) => {
  const user = req.user;
  const channels = await Subscription.aggregate([
    {
      $match: {
        subscriber: new mongoose.Types.ObjectId(user._id),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "subscribeTo",
        foreignField: "_id",
        as: "username",
      },
    },
    {
      $unwind: "$username",
    },
    {
      $group: {
        _id: "$user_id",
        subscriptions: { $push: "$username.username" },
      },
    },
  ]);
  console.log(channels);
  if (channels.length === 0) {
    res
      .status(201)
      .json(new ApiResponse(201, "U have not subscribed any channel yet"));
  }
  res
    .status(201)
    .json(new ApiResponse(201, channels, "subscriptions fetched successfully"));
});

//clear
const subscriptions = asyncHandler(async (req, res) => {
  const user = req.user;
  const videos = await Subscription.aggregate([
    {
      $match: {
        subscriber: new mongoose.Types.ObjectId(user._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "subscribeTo",
        foreignField: "owner",
        as: "Videos",
      },
    },
    {
      $addFields: {
        username: { $arrayElemAt: ["$Videos.username", 0] },
      },
    },
    {
      $project: {
        username: 1,
        Videos: 1,
      },
    },
    {//channel with no videos are excluded
      $match: {
        Videos: { $not: { $size: 0 } }, // Filter out documents where Videos array is empty
      },
    },
  ]);
  if (videos.length === 0) {
    res
      .status(201)
      .json(new ApiResponse(201, "you have not subscribed any channel yet"));
  }
  res
    .status(201)
    .json(new ApiResponse(201, videos, "videos fetched successfully"));
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
  subscribe,
  subscriptions,
  unSubscribe,
  subscriptionChannels,
};
