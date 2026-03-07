// routes/likes.js
import express from "express";
import mongoose from "mongoose";
import LikedRecipe from "../models/LikedRecipe.js";
import Recipe from "../models/Recipe.js";

const router = express.Router();

function requireUser(req, res) {
  const userEmail = (req.header("x-user-email") || "").trim().toLowerCase();
  if (!userEmail) {
    res.status(401).json({ error: "Missing x-user-email" });
    return null;
  }
  return userEmail;
}

// state for ONE recipe (for button)
router.get("/recipes/:id/like-state", async (req, res) => {
  try {
    const userEmail = requireUser(req, res);
    if (!userEmail) return;

    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: "Invalid recipe id" });

    const row = await LikedRecipe.findOne({ userEmail, recipeId: id }).lean();
    res.json({ liked: !!row });
  } catch (err) {
    console.error("GET like-state failed:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// LIKE
router.post("/recipes/:id/like", async (req, res) => {
    try {
      const userEmail = requireUser(req, res);
      if (!userEmail) return;
  
      const { id } = req.params;
      if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: "Invalid recipe id" });
  
      const recipe = await Recipe.findById(id).select("createdByEmail published").lean();
      if (!recipe) return res.status(404).json({ error: "Recipe not found" });
  
      if (!recipe.published) return res.status(403).json({ error: "Cannot like unpublished recipe" });
  
      const owner = (recipe.createdByEmail || "").trim().toLowerCase();
      if (owner && owner === userEmail) return res.status(400).json({ error: "Cannot like your own recipe" });
  
      await LikedRecipe.updateOne(
        { userEmail, recipeId: id },
        { $setOnInsert: { userEmail, recipeId: id } },
        { upsert: true }
      );
  
      res.json({ ok: true, liked: true });
    } catch (err) {
      console.error("POST like failed:", err);
      res.json({ ok: true, liked: true });
    }
  });

// UNLIKE
router.delete("/recipes/:id/like", async (req, res) => {
  try {
    const userEmail = requireUser(req, res);
    if (!userEmail) return;

    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: "Invalid recipe id" });

    await LikedRecipe.deleteOne({ userEmail, recipeId: id });
    res.json({ ok: true, liked: false });
  } catch (err) {
    console.error("DELETE like failed:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Saved Recipes page feed = (my recipes) UNION (recipes I liked)
router.get("/me/saved-recipes", async (req, res) => {
  try {
    const userEmail = requireUser(req, res);
    if (!userEmail) return;

    // my recipes
    const myRecipes = await Recipe.find({ createdByEmail: userEmail })
      .sort({ updatedAt: -1 })
      .lean();

    // liked recipes (not mine typically, but we’ll just include them)
    const likedRows = await LikedRecipe.find({ userEmail }).select("recipeId").lean();
    const likedIds = likedRows.map((r) => r.recipeId);

    const likedRecipes = likedIds.length
    ? await Recipe.find({ _id: { $in: likedIds }, published: true }).lean()
    : [];

    // de-dupe by id (in case user liked their own via old data)
    const map = new Map();
    for (const r of [...myRecipes, ...likedRecipes]) map.set(String(r._id), r);

    res.json({
      recipes: Array.from(map.values()),
    });
  } catch (err) {
    console.error("GET saved-recipes failed:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;