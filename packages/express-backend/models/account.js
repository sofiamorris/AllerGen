import mongoose from "mongoose";

const AccountSchema = new mongoose.Schema(
  {
    //first name of the account holder
    firstname: {
      type: String,
      required: true,
      trim: true
    },
    //last name of the account holder
    lastname: {
      type: String,
      required: true,
      trim: true
    },
    //user's email address
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    //user's password
    password: {
      type: String,
      required: true,
      trim: true
    },
    //indicates whether the user's email has been verified
    isVerified: {
      type: Boolean,
      default: false
    },
    //URL to the user's profile picture
    profile_pic: {
      type: String,
      trim: true,
      default:
        "https://polyeats1901.blob.core.windows.net/images/profile-pictures/defaultprofilepic.jpeg"
    },
    //list of user's favorite restaurants
    favorites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Recipes"
      }
    ],
    //date the user created the account
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { collection: "accounts" } //MongoDB collection
);

const Account = mongoose.model("Account", AccountSchema);

export default Account;