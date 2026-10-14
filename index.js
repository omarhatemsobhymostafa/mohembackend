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
  try {
    const weeksData = await WeeksModel.find().lean();

    const normalizedWeeks = weeksData
      .map((item) => {
        const weekNumber = String(item.weekNumber || "");
        const numericWeek = Number(
          weekNumber.replace(/^week_/, "")
        );

        return {
          ...item,
          numericWeek: Number.isNaN(numericWeek)
            ? null
            : numericWeek,
        };
      })
      .filter((item) => item.numericWeek !== null)
      .filter(
        (item) =>
          item.numericWeek >= 1 &&
          item.numericWeek <= 41
      )
      .sort((a, b) => a.numericWeek - b.numericWeek)
      .filter(
        (item, index, array) =>
          array.findIndex(
            (entry) =>
              entry.numericWeek === item.numericWeek
          ) === index
      )
      .map(({ numericWeek, ...rest }) => rest);

    res.status(200).json(normalizedWeeks);
  } catch (error) {
    console.error("GET /weeksdata failed:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch weeks data",
    });
  }
});

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
