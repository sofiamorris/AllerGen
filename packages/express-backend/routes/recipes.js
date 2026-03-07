// routes/recipes.js
import express from "express";
import Recipe from "../models/Recipe.js";
import multer from "multer";
import mongoose from "mongoose";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

function canon(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[\s_-]+/g, "")   // remove spaces, underscores, dashes
    .replace(/[^\w]/g, "");    // remove anything else weird
}

const canonToSchemaKey = {
  vegan: "Vegan",
  vegetarian: "Vegetarian",
  pescatarian: "Pescatarian",
  keto: "Keto",
  halal: "Halal",
  kosher: "Kosher",
  glutenfree: "GlutenFree",
  dairyfree: "DairyFree",
  nutfree: "NutFree",
  lowcarb: "LowCarb",
  lowsodium: "LowSodium",
};

function normalizeNutritionTypes(input) {
  const defaults = {
    Vegan: false, Vegetarian: false, GlutenFree: false, Pescatarian: false,
    Keto: false, Halal: false, Kosher: false, DairyFree: false,
    NutFree: false, LowCarb: false, LowSodium: false
  };

  if (Array.isArray(input)) {
    const out = { ...defaults };
    for (const label of input) {
      const key = canonToSchemaKey[canon(label)];
      if (key) out[key] = true;
    }
    return out;
  }

  if (input && typeof input === "object") {
    const out = { ...defaults };
    for (const [rawKey, rawVal] of Object.entries(input)) {
      const key = canonToSchemaKey[canon(rawKey)];
      if (!key) continue;
      out[key] = Boolean(rawVal);
    }
    return out;
  }

  return { ...defaults };
}

function getUserEmail(req) {
  return req.userEmail || null;
}

/**
 * GET /api/recipes/mine
 * Return recipes created by this email.
 */
router.get("/mine", async (req, res) => {
  try {
    const email = getUserEmail(req);
    if (!email) return res.json([]); // no "logged in" email => empty list

    const docs = await Recipe.find({ createdByEmail: email }).sort({ createdAt: -1 });
    res.json(docs);
  } catch (e) {
    console.error("GET /api/recipes/mine failed:", e);
    res.status(500).json({ error: e.message || "Server error" });
  }
});

/**
 * GET /api/recipes
 * (Optional admin/dev) Return everything
 */
router.get("/", async (_req, res) => {
  try {
    const docs = await Recipe.find().sort({ createdAt: -1 });
    res.json(docs);
  } catch (e) {
    console.error("GET /api/recipes failed:", e);
    res.status(500).json({ error: e.message || "Server error" });
  }
});

/**
 * POST /api/recipes
 * Save recipe with createdByEmail from header.
 */
router.post("/", async (req, res) => {
  try {
    const email = getUserEmail(req);

    const {
      name,
      image,
      rawText,
      ingredients = [],
      instructions = [],
      substitutions = [],
      nutrition_types = {},
      category
    } = req.body;

    if (!name) return res.status(400).json({ error: "name is required" });

    const doc = await Recipe.create({
      createdByEmail: email,
      name,
      image,
      rawText,
      category,
      ingredients: Array.isArray(ingredients) ? ingredients : [],
      instructions: Array.isArray(instructions) ? instructions : [],
      substitutions: Array.isArray(substitutions) ? substitutions : [],
      nutrition_types: normalizeNutritionTypes(nutrition_types)
    });

    res.status(201).json(doc);
  } catch (err) {
    console.error("POST /api/recipes failed:", err);
    res.status(500).json({ error: "Failed to save recipe" });
  }
});

/**
 * GET /api/recipes/public
 * Everyone can see published recipes.
 * Supports diets/match/sort/limit/page
 */
router.get("/public", async (req, res) => {
  try {

    const labelToSchemaKey = { Vegan: "Vegan", Vegetarian: "Vegetarian", Pescatarian: "Pescatarian", Keto: "Keto", Halal: "Halal", Kosher: "Kosher", "Gluten-Free": "GlutenFree", GlutenFree: "GlutenFree", "Dairy-Free": "DairyFree", DairyFree: "DairyFree", "Nut-free": "NutFree", NutFree: "NutFree", "Low-carb": "LowCarb", LowCarb: "LowCarb", "Low-sodium": "LowSodium", LowSodium: "LowSodium" };
    
    const { diets, match = "all", sort = "latest", limit = "50", page = "0" } = req.query;

    const mongoQuery = { published: true };

    if (diets) {
      const labels = String(diets).split(",").map(s => s.trim()).filter(Boolean);
      const keys = Array.from(new Set(labels.map(l => labelToSchemaKey[l]).filter(Boolean)));

      if (keys.length) {
        if (String(match).toLowerCase() === "any") {
          mongoQuery.$or = keys.map(k => ({ [`nutrition_types.${k}`]: true }));
        } else {
          mongoQuery.$and = keys.map(k => ({ [`nutrition_types.${k}`]: true }));
        }
      }
    }

    const sortObj = (sort === "stars")
      ? { avg_rating: -1, createdAt: -1 }
      : { createdAt: -1, _id: -1 };

    const lim = Math.max(1, Math.min(500, parseInt(limit, 10) || 50));
    const pg = Math.max(0, parseInt(page, 10) || 0);

    const recipes = await Recipe.find(mongoQuery)
      .sort(sortObj)
      .skip(pg * lim)
      .limit(lim)
      .select("name image category nutrition_types avg_rating published createdAt");

    res.json(recipes);
  } catch (e) {
    console.error("GET /api/recipes/public failed:", e);
    res.status(500).json({ error: e.message || "Server error" });
  }
});

/**
 * GET /api/recipes/:id
 * Anyone can view a recipe IF:
 * - it is published, OR
 * - it belongs to the requesting email
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "Invalid recipe id" });
    }

    const recipe = await Recipe.findById(id);
    if (!recipe) return res.status(404).json({ error: "Recipe not found" });

    const email = getUserEmail(req);
    const isOwner = email && recipe.createdByEmail && recipe.createdByEmail === email;

    if (!recipe.published && !isOwner) {
      return res.status(403).json({ error: "Forbidden" });
    }

    res.json(recipe);
  } catch (err) {
    console.error("GET /api/recipes/:id failed:", err);
    res.status(500).json({ error: "InternalError", message: err.message });
  }
});

/**
 * PATCH /api/recipes/:id
 * Only the owner (createdByEmail) can update
 */
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "Invalid recipe id" });
    }

    const email = getUserEmail(req);
    if (!email) return res.status(403).json({ error: "Forbidden" });

    const update = { ...req.body };

    if (update.nutrition_types) {
      update.nutrition_types = normalizeNutritionTypes(update.nutrition_types);
    }

    const doc = await Recipe.findOneAndUpdate(
      { _id: id, createdByEmail: email },
      req.body,
      { new: true, runValidators: true }
    );

    if (!doc) return res.status(404).json({ error: "Recipe not found" });
    res.json(doc);
  } catch (err) {
    console.error("PATCH /api/recipes/:id failed:", err);
    res.status(500).json({ error: "InternalError", message: err.message });
  }
});

/**
 * PATCH /api/recipes/:id/image
 * Only owner can upload/change image
 */
router.patch("/:id/image", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No image uploaded" });

    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "Invalid recipe id" });
    }

    const email = getUserEmail(req);
    if (!email) return res.status(403).json({ error: "Forbidden" });

    const imageUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;

    const recipe = await Recipe.findOneAndUpdate(
      { _id: id, createdByEmail: email },
      { image: imageUrl },
      { new: true }
    );

    if (!recipe) return res.status(404).json({ error: "Recipe not found" });
    res.json(recipe);
  } catch (err) {
    console.error("PATCH /api/recipes/:id/image failed:", err);
    res.status(500).json({ error: "Image upload failed" });
  }
});

export default router;
