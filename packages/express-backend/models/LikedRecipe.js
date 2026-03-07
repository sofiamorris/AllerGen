import mongoose from "mongoose";

const LikedRecipeSchema = new mongoose.Schema(
  {
    userEmail: { type: String, required: true, lowercase: true, trim: true, index: true },
    recipeId: { type: mongoose.Schema.Types.ObjectId, ref: "Recipe", required: true, index: true },
  },
  { timestamps: true }
);

LikedRecipeSchema.index({ userEmail: 1, recipeId: 1 }, { unique: true });

export default mongoose.models.LikedRecipe || mongoose.model("LikedRecipe", LikedRecipeSchema);