import mongoose from "mongoose";

const commentSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  parentComment_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Comment",
    default : null,
  },
  video_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Video",
    default : null
  },
  content: {
    type: String,
    require: true,
  },
});

export const Comment = mongoose.model("Comment", commentSchema);
