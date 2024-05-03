import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    subscriber:
      //one whose is subscribing, not an array
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        require: true,
        unique: true,
      },
    channel: {
      // one whose channel is being subscribed;
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      require: true,
      unique: true,
    },
  },
  { timestamps: true }
);

export const Subscription = mongoose.model(
  "Subscription",
  subscriptionSchema
);
