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

app.patch('/weeksdata/:weekNo', async (req, res) => {
  try {
    const allowedFields = [
      'babySize',
      'WhappenInBody',
      'sympotyms',
      'babyLooks',
      'option1',
      'option2'
    ]
    const updates = Object.fromEntries(
      allowedFields
        .filter((field) => Object.prototype.hasOwnProperty.call(req.body, field))
        .map((field) => [field, String(req.body[field] ?? '')])
    )

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'At least one week field is required' })
    }

    const week = await WeeksModel.findOneAndUpdate(
      { weekNumber: req.params.weekNo },
      { $set: updates },
      { new: true, runValidators: true }
    )

    if (!week) {
      return res.status(404).json({ message: 'Week not found' })
    }

    res.json({ message: 'Week updated successfully', week })
  } catch (error) {
    console.error('WEEK UPDATE ERROR:', error)
    res.status(500).json({ message: error.message })
  }
})

const signToken = id => {
  return  jwt.sign({ id } , process.env.JWT_SECRET , {
      expiresIn: process.env.JWT_EXPIRES_IN
    })
}

app.post("/signup", async (req, res) => {
  try {
    const { clerkId, pregnancies = [], kids = [] } = req.body;

    if (!clerkId) {
      return res.status(400).json({
        message: "clerkId is required"
      });
    }

    const existingUser = await User.findOne({ clerkId });

    if (existingUser) {
      if (ADMIN_CLERK_IDS.has(clerkId) && existingUser.role !== "admin") {
        existingUser.role = "admin";
        await existingUser.save();
      }
      const token = signToken(existingUser.clerkId);

      return res.status(200).json({
        message: "User already exists",
        user: existingUser,
        token
      });
    }

    const user = await User.create({
      clerkId,
      role: ADMIN_CLERK_IDS.has(clerkId) ? "admin" : "user",
      pregnancies,
      kids
    });

    const token = signToken(user.clerkId);

    res.status(201).json({
      message: "User created successfully",
      user,
      token
    });

  } catch (error) {
    console.error("SIGNUP ERROR:", error);

    res.status(500).json({
      message: error.message
    });
  }
});

app.post("/login" , async (req ,res)=>{
  const {clerkId} = req.body
  const user = await User.findOne({clerkId})
  
  if(!user){
    return res.json({message:"اليوزر مش وجود"})
  }

  const token = signToken(user.clerkId)
  res.json({
    status:'success',
    token
  })


})

app.get("/users/:clerkId", async (req, res) => {
  try {
    const user = await User.findOne({ clerkId: req.params.clerkId });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ user });
  } catch (error) {
    console.error("USER FETCH ERROR:", error);
    res.status(500).json({ message: error.message });
  }
});

app.patch("/users/:clerkId/pregnancy", async (req, res) => {
  try {
    const { lastPeriod } = req.body;

    if (!lastPeriod || Number.isNaN(Date.parse(lastPeriod))) {
      return res.status(400).json({
        message: "A valid lastPeriod date is required"
      });
    }

    const user = await User.findOneAndUpdate(
      { clerkId: req.params.clerkId },
      { $set: { pregnancies: [{ lastPeriod: new Date(lastPeriod) }] } },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: "Pregnancy date saved successfully",
      user
    });
  } catch (error) {
    console.error("PREGNANCY UPDATE ERROR:", error);
    res.status(500).json({ message: error.message });
  }
});
