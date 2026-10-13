const express = require("express");
const app = express();
const jwt = require('jsonwebtoken')
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const WeeksModel = require('./models/weekModel')
const User = require('./models/userModel')
dotenv.config();
app.use(cors());
app.use(express.json());
const ADMIN_CLERK_IDS = new Set(
  (process.env.ADMIN_CLERK_IDS || "")
    .split(",")
    .map((clerkId) => clerkId.trim())
    .filter(Boolean)
);
const PORT = process.env.PORT;

mongoose.connect(process.env.MONGO_URI).then(() => {
  console.log("DB CONNECTED SUCCESSFULLY");
}).catch((err) => {
  console.log("exit with errors", err);
})

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});


app.get("/weeksdata", async (req, res) => {
  const WeeksData = await WeeksModel.find()

  const normalizedWeeks = WeeksData
    .map((item) => {
      const weekNumber = String(item.weekNumber || "")
      const numericWeek = Number(weekNumber.replace(/^week_/, ""))

      return {
        ...item.toObject(),
        numericWeek: Number.isNaN(numericWeek) ? null : numericWeek,
      }
    })
    .filter((item) => item.numericWeek !== null)
    .filter((item) => item.numericWeek >= 1 && item.numericWeek <= 41)
    .sort((a, b) => a.numericWeek - b.numericWeek)
    .filter((item, index, array) => array.findIndex((entry) => entry.numericWeek === item.numericWeek) === index)
    .map(({ numericWeek, ...rest }) => rest)

  res.json(normalizedWeeks)
})
app.get('/weeksdata/:weekNo', async (req, res) => {
  try {
    const week = await WeeksModel.findOne({
      weekNumber: req.params.weekNo
    })

    if (!week) {
      return res.status(404).json({
        message: "Week not found"
      })
    }

    res.json(week)

  } catch (error) {
    res.status(500).json({
      message: error.message
    })
  }
})


