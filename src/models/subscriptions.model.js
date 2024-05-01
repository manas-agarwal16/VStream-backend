// it is not optimal to have an array of users in subscriber because there can be millions of subscribers and if someone unsubscrib the channel that is will take alot of  time complexity to search and delete that user. so we will create a document for each user who subscrib a channel.see diagrams from copy.

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
