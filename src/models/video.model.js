import mongoose from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new mongoose.Schema(
  {
    videoFile: {
      type: String,
      require: true,
    },
    thumbnail: {
      type: String,
      require: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
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
      default: 0,
    },
    views: {
      type: Number,
      require: true,
      default: 0,
    },
    isPublished: {
      type: Boolean,
      require: true,
      default: false,
    },
  },
  { timestamps: true }
);

videoSchema.plugin(mongooseAggregatePaginate); //plugin to mongoose-aggregate-paginate-v2 to use aggregate queries

export const Video = mongoose.model("Video",videoSchema);
