import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    subscriber:
      //one whose is subscribing, not an array
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        require: true,
      },
    subscribeTo: {
      // username is being subscribed
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      require: true,
    },
  },
  { timestamps: true }
);

export const Subscription = mongoose.model("Subscription", subscriptionSchema);
