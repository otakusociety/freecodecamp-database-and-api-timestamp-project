const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const shortid = require("shortid");
const dns = require("dns");

dotenv.config();

const app = express();

app.use(cors({ optionsSuccessStatus: 200 }));
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const uri = process.env.MONGO_URI;

mongoose
  .connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("Connected to MongoDB!"))
  .catch((err) => console.error("Failed to connect to MongoDB:", err));

const ShortURL = mongoose.model(
  "ShortURL",
  new mongoose.Schema({
    original_url: String,
    short_url: String,
    suffix: String,
  })
);

const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/home.html");
});

app.post("/api/shorturl", async (req, res) => {
  let originalURL = req.body.url;

  if (!originalURL || !isValidUrl(originalURL)) {
    return res.status(400).json({ error: "invalid url" });
  }

  const suffix = shortid.generate();
  const newURL = new ShortURL({ original_url: originalURL, short_url: suffix, suffix });

  try {
    await newURL.save();
    res.json({
      original_url: originalURL,
      short_url: suffix,
    });
  } catch (err) {
    console.error("Failed to save URL:", err);
    res.status(500).json({ error: "Failed to save URL" });
  }
});

app.get("/api/shorturl/:suffix", async (req, res) => {
  const { suffix } = req.params;
  try {
    const foundURL = await ShortURL.findOne({ suffix });
    if (foundURL) {
      return res.redirect(foundURL.original_url);
    }
    res.status(404).json({ error: "No short URL found for the given input" });
  } catch (err) {
    console.error("Error retrieving URL:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server is running on http://localhost:${PORT}`));
