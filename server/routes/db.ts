import { Router } from "express";
import { readDb, writeDb } from "../services/database";

const router = Router();

// API Endpoints for read/write operations
router.get("/", (req, res) => {
  res.json(readDb());
});

router.post("/", (req, res) => {
  const newState = req.body;
  writeDb(newState);
  res.json({ success: true, state: newState });
});

export default router;
