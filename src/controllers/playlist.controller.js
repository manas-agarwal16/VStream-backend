import { Playlist } from "../models/playlist.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/videos.model.js";
import mongoose, { mongo } from "mongoose";

//clear
const createPlaylist = asyncHandler(async (req, res) => {
  const user = req.user;
  const { title, video_id } = req.body;
  if (!title) {
    throw new ApiError(401, "title is required");
  }
  if (!video_id) {
    throw new ApiError(401, "video_id is required");
  }
  const videoExists = await Video.findById({ _id: video_id });
  if (!videoExists) {
    throw new ApiError(401, "no video with such video_id exists");
  }
  const alreadyTitled = await Playlist.findOne({
    title: title,
    user_id: user._id,
  });

  if (alreadyTitled) {
    return res
      .status(201)
      .json(new ApiResponse(201, "Playlist will this title already exists"));
  }

  const playlist = new Playlist({
    user_id: user._id,
    title,
  });

  await playlist
    .save()
    .then(() => {
      console.log("playlist saved successfully");
    })
    .catch((err) => {
      throw new ApiError(501, "error in saving playlist", err);
    });

  const videos = [video_id];
  const update = await Playlist.findOneAndUpdate(
    { title: title, user_id: user._id },
    { videos: videos },
    { new: true }
  );
  if (!update) {
    throw new ApiError(501, "error in updating playlist");
  }
  return res
    .status(201)
    .json(new ApiResponse(201, "Playlist created successfuilly"));
});

//clear
const addToPlaylist = asyncHandler(async (req, res) => {
  const { video_id, title } = req.body;
  const user = req.user;
  if (!video_id) {
    throw new ApiError(401, "video_id is required");
  }

  if (!title) {
    throw new ApiError(401, "playlist title is requiredd");
  }

  const playlist = await Playlist.findOne({ title: title, user_id: user._id });
  if (!playlist) {
    throw new ApiError(401, "no such playlist exists");
  }
  const videoExits = await Video.findOne({ _id: video_id });
  if (!videoExits) {
    throw new ApiError(401, "no such video_id exists");
  }

  const alreadyAdded = playlist.videos.includes(video_id);

  if (alreadyAdded) {
    return res
      .status(201)
      .json(new ApiResponse(201, `video is already added in ${title}`));
  }

  console.log(playlist.videos);
  playlist.videos.push(video_id);

  const updatePlaylist = await Playlist.findOneAndUpdate(
    { title: title, user_id: user._id },
    { videos: playlist.videos },
    { new: true }
  );
  if (!updatePlaylist) {
    throw new ApiError(501, "error in updating playlist");
  }
  res
    .status(201)
    .json(new ApiResponse(201, updatePlaylist, `video added to ${title}`));
});

//clear
const removeFromPlaylist = asyncHandler(async (req, res) => {
  const user = req.user;
  const { video_id, title } = req.body;
  if (!video_id || !title) {
    throw new ApiError(401, "video_id and playlist title both are required");
  }
  const videoExits = await Video.findOne({ _id: video_id });
  if (!videoExits) {
    throw new ApiError(401, "NO such vided with this id exists");
  }
  const playlistExists = await Playlist.findOne({
    user_id: user._id,
    title: title,
  });
  if (!playlistExists) {
    throw new ApiError(401, "on such playlist with this title exists");
  }

  const videoInPlaylist = playlistExists.videos.includes(video_id);
  if (!videoInPlaylist) {
    return res
      .status(201)
      .json(new ApiResponse(201, "video is not added into this playlist"));
  }

  console.log(playlistExists);
  const newVideos = playlistExists.videos;
  newVideos.remove(video_id);

  if (newVideos.length === 0) {
    const deletePlaylist = await Playlist.findOneAndDelete({
      title: title,
      user_id: user._id,
    });
    if (!deletePlaylist) {
      throw new ApiError(501, "error in deleting playlist");
    }
    return res
      .status(201)
      .json(new ApiResponse(201, "video removed successfully"));
  }

  console.log(newVideos);

  const update = await Playlist.findOneAndUpdate(
    { title: title, user_id: user._id },
    { videos: newVideos },
    { new: true }
  );

  if (!update) {
    throw new ApiError(501, "error in updating playlist");
  }

  res
    .status(201)
    .json(new ApiResponse(201, update, "video removed successfully"));
});

//clear
const deletePlaylist = asyncHandler(async (req, res) => {
  const user = req.user;
  const { title } = req.body;
  if (!title) {
    throw new ApiError(401, "title is required");
  }
  const exists = await Playlist.findOne({ title: title, user_id: user._id });
  if (!exists) {
    throw new ApiError(401, "no such playlist exists");
  }

  const deletePlaylist = await Playlist.findOneAndDelete({
    user_id: user._id,
    title: title,
  });
  if (!deletePlaylist) {
    throw new ApiError(501, "error in deleting playlist");
  }
  res.status(201).json(new ApiResponse(201, "playlist deleted successfully"));
});

//clear
const myPlaylists = asyncHandler(async (req, res) => {
  const user = req.user;
  const playlists = await Playlist.aggregate([
    {
      $match: {
        user_id: new mongoose.Types.ObjectId(user._id),
      },
    },
    {
      $addFields: {
        lastVideo: { $arrayElemAt: ["$videos", -1] },
        totalVideos: { $size: "$videos" },
      },
    },
    {
      $lookup: {
        from: "videos",
        foreignField: "_id",
        localField: "lastVideo",
        as: "Video",
      },
    },
    {
      $unwind: "$Video",
    },
    {
      $project: {
        createdAt: 1,
        updatedAt: 1,
        title: 1,
        totalVideos: 1,
        thumbnail: "$Video.thumbnail",
      },
    },
  ]);
  // console.log(playlists);
  if (playlists.length === 0) {
    return res
      .status(201)
      .json(new ApiResponse(201, "You haven't made any playlist yet"));
  }
  res
    .status(201)
    .json(new ApiResponse(201, playlists, "playlists fetched successfully"));
});

//clear
const viewPlaylist = asyncHandler(async (req, res) => {
  const user = req.user;
  const { title } = req.body;
  if (!title) {
    throw new ApiError(401, "title is required");
  }

  const exist = await Playlist.findOne({ title: title, user_id: user._id });
  if (!exist) {
    throw new ApiResponse(401, "no playlist with this title exist");
  }
  const videos = await Playlist.aggregate([
    {
      $match: {
        user_id: new mongoose.Types.ObjectId(user._id),
        title: title,
      },
    },
    {
      $lookup: {
        from: "videos",
        foreignField: "_id",
        localField: "videos",
        as: "videos",
      },
    },
  ]);
  console.log(videos);
  res
    .status(201)
    .json(new ApiResponse(201, videos, "playlist videos fetched successfully"));
});

const mergePlaylists = asyncHandler(async (req, res) => {
  const user = req.user;
  const { title1, title2, newPlaylistTitle } = req.body;
  if (!title1 || !title2 || !newPlaylistTitle) {
    throw new ApiError(401, "All titles required");
  }
  let exists = await Playlist.findOne({ title: title1, user_id: user._id });
  if (!exists) {
    throw new ApiError(401, `No playlist with title ${title1} exists`);
  }
  exists = await Playlist.findOne({ title: title2, user_id: user._id });
  if (!exists) {
    throw new ApiError(401, `No playlist with title ${title2} exists`);
  }
  const videos = await Playlist.aggregate([
    {
      $match: {
        user_id: user._id,
      },
    },
    {
      $match: {
        $or: [{ title: title1 }, { title: title2 }],
      },
    },
    {
      $unwind: "$videos",
    },
    {
      $group: {
        _id: "$user_id",
        videos: { $push: "$videos" },
      },
    },
  ]);
  // console.log(videos);
  let mergedVideos = [];
  for (let i = 0; i < videos[0].videos.length; i++) {
    const videoId = videos[0].videos[i];
    // console.log(videoId);
    if (!(mergedVideos.includes(videoId))) {
      mergedVideos.push(videoId);
      console.log(mergedVideos);
    }
  }
  console.log(mergedVideos);
  res
    .status(201)
    .json(new ApiResponse(201, mergedVideos, "playlists merged successfully"));
});

export {
  createPlaylist,
  addToPlaylist,
  removeFromPlaylist,
  deletePlaylist,
  myPlaylists,
  viewPlaylist,
  mergePlaylists,
};
