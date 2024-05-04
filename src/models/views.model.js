import mongoose from "mongoose";

const viewSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  video_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Video",
  },
});

export const Views = mongoose.model("Views", viewSchema);
