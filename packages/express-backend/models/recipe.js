import mongoose from "mongoose";

const RecipeSchema = new mongoose.Schema(
  {
    createdByEmail: {
      type: String,
      trim: true,
      lowercase: true,
      index: true,
    },
    //recipe name
    name: {
      type: String,
      required: true,
      trim: true
    },
    //recipe's average rating
    avg_rating: {
      type: Number,
      min: 1,
      max: 5,
      default: 3
    },
    //recipe publicity status
    published: {
        type: Boolean,
        default: false
    },
    //nutrition types
    nutrition_types: {
      Vegan: { type: Boolean, default: false },
      Vegetarian: { type: Boolean, default: false },
      GlutenFree: { type: Boolean, default: false },
      Pescatarian: { type: Boolean, default: false },
      Keto: { type: Boolean, default: false },
      Halal: { type: Boolean, default: false },
      Kosher: { type: Boolean, default: false },
      DairyFree: { type: Boolean, default: false },
      NutFree: { type: Boolean, default: false },
      LowCarb: { type: Boolean, default: false },
      LowSodium: { type: Boolean, default: false },
    },
    //URL to recipe image
    image: {
      type: String,
      trim: true
    },
    rawText: { 
        type: String
    }, 
    //ingredients text
    ingredients: {
        type: [String],
        default: []
    },
    //instructions text
    instructions: {
        type: [String],
        default: []
    },
    //substitutions text
    substitutions: {
        type: [String],
        default: []
    },
    category: {
      type: String,
      enum: ["Breakfast", "Lunch", "Dinner", "Dessert", "Snacks"],
      index: true
    },
  },
  { timestamps: true, collection: "Recipes" } //MongoDB collection
);

const Recipe = mongoose.models.Recipe || mongoose.model("Recipe", RecipeSchema);

export default Recipe;