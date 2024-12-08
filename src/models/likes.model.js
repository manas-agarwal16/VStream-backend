import mongoose from "mongoose";

const likeSchema = new mongoose.Schema({
    user_id : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "User",
    },
    model_id : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "Video",
        require : true,
    },
    modelName : {
        type : String,
        require : true,
        enum : ["video","comment","song"],
    }
});

export const Likes = mongoose.model("Likes",likeSchema);