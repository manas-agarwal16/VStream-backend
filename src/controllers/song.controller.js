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
import mongoose, { modelNames } from "mongoose";
import { public_id } from "../utils/public_id.js";
import { Song } from "../models/song.model.js";
//clear
const uploadSong = asyncHandler(async (req, res) => {
  const user = req.user;
  const { songName } = req.body;
  if (!songName) {
    throw new ApiError(401, "songName is required");
  }
  console.log(req.files);
  const songFile = req.files?.song[0].path;

  if (!songFile) {
    throw new ApiError(401, "songFile is required");
  }
  if (songFile.includes(".mp4")) {
    throw new ApiError(401, "song file is expected.");
  }

  let upload;
  try {
    upload = await uploadOncloudinary(songFile);
    if (!upload) {
      throw new ApiError(501, "error in uploading song to cloudinary");
    }
  } catch (error) {
    throw new ApiError(501, "error in uploading song to cloudinary");
  }
  console.log("here", upload.url);
  const newSong = new Song({
    songName,
    username: user.username,
    songFile: upload.url,
  });

  await newSong.save();
  res
    .status(201)
    .json(new ApiResponse(201, newSong, "song uploaded successfully"));
});

const deleteSong = asyncHandler(async (req, res) => {
  const user = req.user;
  const { song_id } = req.body;
  if (!song_id) {
    throw new ApiError(401, "song_id is required");
  }

  try {
    const exists = await Song.findOne({
      _id: song_id,
      username: user.username,
    });
    if (!exists) {
      throw new ApiError(
        401,
        "invalid song_id or invalid request to delete the song"
      );
    }
  } catch (error) {
    throw new ApiError(
      401,
      "invalid song_id or invalid request to delete the song"
    );
  }

  const deleteSong = await Song.findOneAndDelete({
    _id: song_id,
    username: user.username,
  });
  if (!deleteSong) {
    throw new ApiError(501, "error in deleting song");
  }

  res
    .status(201)
    .json(new ApiResponse(201, deleteSong, "song deleted successfully"));
});

const likeSong = asyncHandler(async (req, res) => {
  const user = req.user;
  const { song_id } = req.body;
  if (!song_id) {
    throw new ApiError(401, "song_id is required");
  }

  try {
    const exists = await Song.findOne({ _id: song_id });
    if (!exists) {
      throw new ApiError(401, "invalid song_id");
    }
  } catch (error) {
    throw new ApiError(401, "invalid song_id", error);
  }

  const alreadyLiked = await Likes.findOne({
    model_id: song_id,
    user_id: user._id,
  });
  if (alreadyLiked) {
    return res
      .status(201)
      .json(new ApiResponse(201, "You have already liked this song"));
  }
  const likeSong = new Likes({
    user_id: user._id,
    model_id: song_id,
    modelName: "song",
  });

  await likeSong.save();

  res
    .status(201)
    .json(new ApiResponse(201, "Your like on this song marked successfully"));
});

const unlikeSong = asyncHandler(async (req, res) => {
  const user = req.user;
  const { song_id } = req.body;
  if (!song_id) {
    throw new ApiError(401, "song_id is required");
  }

  try {
    const exists = await Song.findOne({ _id: song_id });
    if (!exists) {
      throw new ApiError(401, "invalid song_id");
    }
  } catch (error) {
    throw new ApiError(401, "invalid song_id", error);
  }

  const notLiked = await Likes.findOne({
    model_id: song_id,
    user_id: user._id,
  });
  if (!notLiked) {
    res.status(201).json(new ApiResponse(201, "You haven't liked this song"));
  }

  const deleteLike = await Likes.findOneAndDelete({
    model_id: song_id,
    user_id: user._id,
  });
  if (!deleteLike) {
    throw new ApiError(501, "error in deleting like");
  }

  res
    .status(201)
    .json(new ApiResponse(201, "you unliked this song successfully"));
});

//all songs
const getSongs = asyncHandler(async (req, res) => {
  //   const songs = await Song.find();
  const songs = await Song.aggregate([
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
  res
    .status(201)
    .json(new ApiResponse(201, songs, "songs fetched succesfully"));
});

const searchSongs = asyncHandler(async (req, res) => {
  let { search } = req.body;
  if (!search) {
    throw new ApiError(401, "search something");
  }

  const songs = await Song.find({
    $or: [
      { songName: { $regex: search, $options: "i" } },
      { username: { $regex: search, $options: "i" } },
    ],
  });

  const randomSongs = await Song.find();
  while (songs.length < 8) {
    const index = Math.floor(Math.random() * randomSongs.length);
    if (!songs.includes(randomSongs[index])) {
      songs.push(randomSongs[index]);
    }
  }

  if (songs.length === 0) {
    return res
      .status(201)
      .json(
        new ApiResponse(
          201,
          "Sorry 😓 , Your search did not match any document"
        )
      );
  }

  res
    .status(201)
    .json(new ApiResponse(201, songs, "songs fetched successfully"));
});

export { uploadSong, getSongs, searchSongs, likeSong, unlikeSong , deleteSong };
