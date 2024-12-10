import { User } from "../models/users.model.js";
import { Video } from "../models/videos.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Subscription } from "../models/subscriptions.model.js";
import mongoose from "mongoose";

//clear
const toggleSubscribe = asyncHandler(async (req, res) => {
  const user = req.user;
  const { username } = req.body; //frontend- username = channel

  console.log("username : ", username);

  if (!username) {
    throw new ApiError(401, "userame/channelName is required");
  }

  const subscribeTo = await User.findOne({ username });

  if (!subscribeTo) {
    throw new ApiError(401, "No such channel exists");
  }

  const subscribed = await Subscription.findOne({
    subscriber: user._id,
    subscribeTo: subscribeTo._id,
  });

  if (subscribed) {
    const deleteSubscription = await Subscription.findOneAndDelete({
      subscriber: user._id,
      subscribeTo: subscribeTo._id,
    });
    return res
      .status(201)
      .json(new ApiResponse(201, false, `You have unsubscribed this channel`));
  }

  const subscribeChannel = new Subscription({
    subscribeTo: subscribeTo._id,
    subscriber: user._id,
  });

  await subscribeChannel
    .save()
    .then(() => {
      res
        .status(201)
        .json(new ApiResponse(201, true, `You have subscribed ${username}`));
    })
    .catch((err) => {
      throw new ApiError(501, "error in toggling subscription");
    });
});

//clear
const subscriptionChannels = asyncHandler(async (req, res) => {
  console.log("subscriptions");

  const user = req.user;
  let channels = await Subscription.aggregate([
    {
      $match: {
        subscriber: new mongoose.Types.ObjectId(user._id),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "subscribeTo",
        foreignField: "_id",
        as: "subscriptions",
        pipeline: [
          {
            $project: {
              password: 0,
              createdAt: 0,
              updatedAt: 0,
              watchHistory: 0,
              description: 0,
              premium: 0,
              refreshToken: 0,
              coverImage: 0,
            },
          },
        ],
      },
    },
    {
      $unwind: "$subscriptions",
    },
    {
      $group: {
        _id: null,
        subscriptions: { $push: "$subscriptions" },
      },
    },
    {
      $project: {
        _id: 0,
        subscriptions: 1,
      },
    },
  ]);
  console.log("here channel : ", channels);

  if (channels.length > 0) {
    channels = channels[0]?.subscriptions;
    console.log("channels: ", JSON.stringify(channels, null, 2));

    channels = await Promise.all(
      channels?.map(async (subscription) => {
        const subscribers = await Subscription.find({
          subscribeTo: subscription._id,
        });
        const subscribing = await Subscription.find({
          subscriber: subscription._id,
        });
        return {
          ...subscription,
          subscribers: subscribers.length,
          subscribing: subscribing.length,
        };
      })
    );
  }

  res
    .status(201)
    .json(new ApiResponse(201, channels, "subscriptions fetched successfully"));
});

//clear jarurat lgi nai abhi
const subscriptions = asyncHandler(async (req, res) => {
  const user = req.user;
  const videos = await Subscription.aggregate([
    {
      $match: {
        subscriber: new mongoose.Types.ObjectId(user._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "subscribeTo",
        foreignField: "owner",
        as: "Videos",
      },
    },
    {
      $addFields: {
        username: { $arrayElemAt: ["$Videos.username", 0] },
      },
    },
    {
      $project: {
        username: 1,
        Videos: 1,
      },
    },
    {
      //channel with no videos are excluded
      $match: {
        Videos: { $not: { $size: 0 } }, // Filter out documents where Videos array is empty
      },
    },
  ]);
  if (videos.length === 0) {
    res
      .status(201)
      .json(new ApiResponse(201, "you have not subscribed any channel yet"));
  }
  res
    .status(201)
    .json(new ApiResponse(201, videos, "videos fetched successfully"));
});

export { toggleSubscribe, subscriptions, subscriptionChannels };
