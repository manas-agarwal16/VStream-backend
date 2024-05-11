import mongoose, { mongo } from "mongoose";

const playlistSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    title: {
      type: String,
      require: true,
    },
    videos: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Video",
        require: true,
      },
    ],
  },
  { timestamps: true }
);

export const Playlist = mongoose.model("Playlist", playlistSchema);
