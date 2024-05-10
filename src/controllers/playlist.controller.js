import { Playlist } from "../models/playlist.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/videos.model.js";

//clear
const createPlaylist = asyncHandler(async (req, res) => {
  const user = req.user;
  const { title } = req.body;
  if (!title) {
    throw new ApiError(401, "title is required");
  }

  const alreadyTitled = await Playlist.findOne({ title });

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
      return res
        .status(201)
        .json(new ApiResponse(201, "Playlist created successfuilly"));
    })
    .catch((err) => {
      throw new ApiError(501, "error in saving playlist", err);
    });
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

  const playlist = await Playlist.findOne({ title });
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
    { title },
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

export {createPlaylist , addToPlaylist};