import mongoose from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      require: true,
    },
    videoFile: {
      type: String,
      require: true,
    },
    thumbnail: {
      type: String,
      require: true,
    },
    title: {
      type: String,
      require: true,
    },
    description: {
      type: String,
      require: true,
    },
    duration: {
      type: Number, //comes with cloudinary url
      require: true,
    },
    views: {
      type: Number,
      default: 0,
    },
    videoTag: {
      type: String,
      require: true,
      enum : ["games","learning","music","comedy","news","serials","others"]
    },
    username : {
      type : String,
      require : true
    }
  },
  { timestamps: true }
);

videoSchema.plugin(mongooseAggregatePaginate); //plugin to mongoose-aggregate-paginate-v2 to use aggregate queries

export const Video = mongoose.model("Video", videoSchema);
