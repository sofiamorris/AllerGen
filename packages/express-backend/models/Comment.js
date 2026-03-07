import mongoose from "mongoose";

const CommentSchema = new mongoose.Schema(
  {
    recipeId: { type: mongoose.Schema.Types.ObjectId, ref: "Recipe", required: true, index: true },
    authorEmail: { type: String, required: false, lowercase: true, trim: true, index: true },
    authorName: { type: String, required: false, trim: true },
    text: { type: String, required: true },

    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },

    approved: { type: Boolean, default: true },
    reported: { type: Boolean, default: false },
  },
  { timestamps: true }
);

CommentSchema.index({ recipeId: 1, createdAt: -1 });

const Comment = mongoose.models.Comment || mongoose.model("Comment", CommentSchema);
export default Comment;