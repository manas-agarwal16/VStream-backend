import mongoose from "mongoose";

const likeSchema = new mongoose.Schema({
    user_id : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "User",
    },
    video_id : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "Video",
    }
})

export const likeModel = mongoose.model("likeModel",likeSchema);