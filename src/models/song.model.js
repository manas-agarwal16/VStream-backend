import mongoose from "mongoose";

const songSchema = new mongoose.Schema({
    songName : {
        type : String,
        require : true,
    },
    username: {
        type : String,
        require : true
    },
    songFile : {
        type : String,
        require : true
    }
});

export const Song = mongoose.model("Song",songSchema);