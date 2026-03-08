// routes/comments.js
import express from "express";
import mongoose from "mongoose";
import Comment from "../models/Comment.js";
import Recipe from "../models/recipe.js";

const router = express.Router();

/**
 * GET /api/recipes/:id/comments?limit=20&page=0
 * public endpoint - returns approved comments for that recipe
 */
router.get("/recipes/:id/comments", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: "Invalid recipe id" });

    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit || "20", 10)));
    const page = Math.max(0, parseInt(req.query.page || "0", 10));

    const filter = { recipeId: id, approved: true };
    const comments = await Comment.find(filter)
      .sort({ createdAt: -1 })
      .skip(page * limit)
      .limit(limit)
      .lean();

    const total = await Comment.countDocuments(filter);

    res.json({ comments, total, page, limit });
  } catch (err) {
    console.error("GET comments failed:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * POST /api/recipes/:id/comments
 * create a comment. If you allow anonymous comments, accept without user header.
 * prefer: client sends x-user-email and authorName if available.
 */
router.post("/recipes/:id/comments", async (req, res) => {
  try {
    const { id } = req.params;
    const { text, authorName, rating } = req.body;
    const authorEmail = (req.header("x-user-email") || "").trim().toLowerCase() || null;

    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: "Invalid recipe id" });
    if (!text || !String(text).trim()) return res.status(400).json({ error: "Comment text is required" });

    let normalizedRating = null;
    if (rating !== null && rating !== undefined && rating !== "") {
      const n = Number(rating);
      if (!Number.isFinite(n) || n < 1 || n > 5) {
        return res.status(400).json({ error: "Rating must be a number from 1 to 5" });
      }
      normalizedRating = Math.round(n);
    }

    const recipe = await Recipe.findById(id).select("published createdByEmail");
    if (!recipe) return res.status(404).json({ error: "Recipe not found" });

    if (!recipe.published && (!authorEmail || authorEmail !== recipe.createdByEmail)) {
      return res.status(403).json({ error: "Cannot comment on unpublished recipe" });
    }

    const comment = await Comment.create({
      recipeId: id,
      authorEmail,
      authorName: authorName ? String(authorName).trim() : null,
      text: String(text).trim(),
      rating: normalizedRating,
      approved: true,
    });

    res.status(201).json(comment);
  } catch (err) {
    console.error("POST comment failed:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * DELETE /api/comments/:commentId  -> delete comment (owner or moderator)
 * PATCH /api/comments/:commentId  -> moderation action (approve/report)
 * Keep these protected: require moderator flag or check authorEmail matches x-user-email.
 */

router.delete("/comments/:commentId", async (req, res) => {
  try {
    const { commentId } = req.params;
    const email = (req.header("x-user-email") || "").trim().toLowerCase() || null;
    if (!mongoose.isValidObjectId(commentId)) return res.status(400).json({ error: "Invalid id" });

    const comment = await Comment.findById(commentId);
    if (!comment) return res.status(404).json({ error: "Not found" });

    // allow delete if authorEmail matches header, or if moderator (you'll implement moderator check)
    if (comment.authorEmail && email === comment.authorEmail) {
      await comment.deleteOne();
      return res.json({ ok: true });
    }

    // TODO: moderator check here (if you have admin users)
    return res.status(403).json({ error: "Forbidden" });
  } catch (err) {
    console.error("DELETE comment failed:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.patch("/comments/:commentId", async (req, res) => {
  try {
    const { commentId } = req.params;
    const { approved, reported } = req.body;

    if (!mongoose.isValidObjectId(commentId)) return res.status(400).json({ error: "Invalid id" });

    // TODO: restrict to moderators/admins
    const update = {};
    if (typeof approved === "boolean") update.approved = approved;
    if (typeof reported === "boolean") update.reported = reported;

    const updated = await Comment.findByIdAndUpdate(commentId, update, { new: true });
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  } catch (err) {
    console.error("PATCH comment failed:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;