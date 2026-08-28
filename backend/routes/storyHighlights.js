const express = require("express");
const router = express.Router();
const StoryHighlight = require("../models/StoryHighlight");
const Status = require("../models/Status");
const { protect } = require("../middleware/auth");

router.use(protect);

// GET /api/story-highlights - List user's highlights
router.get("/", async (req, res) => {
  try {
    const highlights = await StoryHighlight.find({ userId: req.user._id })
      .populate("statuses")
      .sort({ createdAt: -1 });

    const formatted = highlights.map((h) => {
      const obj = h.toObject();
      return {
        id: String(obj._id),
        ...obj,
        coverUrl:
          obj.coverUrl ||
          obj.statuses?.[0]?.mediaUrl ||
          obj.statuses?.[0]?.content ||
          "",
      };
    });

    res.json({ success: true, highlights: formatted });
  } catch (err) {
    console.error("Fetch highlights error:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch highlights" });
  }
});

// POST /api/story-highlights/create - Create new highlight
router.post("/create", async (req, res) => {
  try {
    const { name, title, color, category, statusIds, coverUrl, coverImage } = req.body;
    const highlightName = name || title;
    const highlightColor = color || coverImage ? '' : (category ? undefined : undefined);
    if (!highlightName || !highlightName.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Name is required" });
    }

    // Resolve ring color from category index or direct color string
    const HIGHLIGHT_COLORS = [
      'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)',
      'linear-gradient(45deg,#1cb5e0,#000851)',
      'linear-gradient(45deg,#00b09b,#96c93d)',
      'linear-gradient(45deg,#f7971e,#ffd200)',
      'linear-gradient(45deg,#8e44ad,#3498db)',
      'linear-gradient(45deg,#e74c3c,#c0392b)',
    ];
    const resolvedColor = color || (category !== undefined ? HIGHLIGHT_COLORS[Number(category) || 0] : HIGHLIGHT_COLORS[0]);
    const resolvedCover = coverUrl || coverImage || '';

    const highlight = await StoryHighlight.create({
      userId: req.user._id,
      name: highlightName.trim(),
      color: resolvedColor,
      coverUrl: resolvedCover,
      statuses: statusIds || [],
    });

    const populated = await StoryHighlight.findById(highlight._id).populate(
      "statuses",
    );
    const obj = populated.toObject();

    res.status(201).json({
      success: true,
      highlight: {
        id: String(obj._id),
        ...obj,
        coverUrl:
          obj.coverUrl ||
          obj.statuses?.[0]?.mediaUrl ||
          obj.statuses?.[0]?.content ||
          "",
      },
    });
  } catch (err) {
    console.error("Create highlight error:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to create highlight" });
  }
});

// GET /api/story-highlights/:id - Get highlight detail with statuses
router.get("/:id", async (req, res) => {
  try {
    const highlight = await StoryHighlight.findOne({
      _id: req.params.id,
      userId: req.user._id,
    }).populate("statuses");

    if (!highlight) {
      return res
        .status(404)
        .json({ success: false, message: "Highlight not found" });
    }

    const obj = highlight.toObject();
    res.json({
      success: true,
      highlight: {
        id: String(obj._id),
        ...obj,
      },
      statusMessages: obj.statuses || [],
    });
  } catch (err) {
    console.error("Get highlight error:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch highlight" });
  }
});

// DELETE /api/story-highlights/:id - Delete highlight
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await StoryHighlight.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!deleted) {
      return res
        .status(404)
        .json({ success: false, message: "Highlight not found" });
    }
    res.json({ success: true, message: "Highlight deleted" });
  } catch (err) {
    console.error("Delete highlight error:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to delete highlight" });
  }
});

module.exports = router;
