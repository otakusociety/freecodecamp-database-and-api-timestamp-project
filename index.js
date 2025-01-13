const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
var bodyParser = require("body-parser");

dotenv.config();

const app = express();

app.use(cors({ optionsSuccessStatus: 200 }));
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const uri = process.env.MONGO_URI;

const clientOptions = {
  serverApi: { version: "1", strict: true, deprecationErrors: true },
};

async function run() {
  try {
    await mongoose.connect(uri, clientOptions);
    await mongoose.connection.db.admin().command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } catch (error) {
    console.error("Failed to connect to MongoDB", error);
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/home.html");
});

app.get("/api/hello", function (req, res) {
  res.json({ greeting: "hello API" });
});

const ShortUrlSchema = new mongoose.Schema({
  original_url: String,
  short_url: Number,
});

const ShortUrl = mongoose.model("ShortUrl", ShortUrlSchema);

let urlCounter = 1; // Initialize a global counter for short_url

function isValidUrl(url) {
  const regex = /^(https?:\/\/)(www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}.*$/;
  return regex.test(url);
}

app.post("/api/shorturl", async (req, res) => {
  let originalUrl = req.body.url;

  if (!isValidUrl(originalUrl)) {
    return res.json({ error: "invalid url" });
  }

  try {
    // Check if the URL already exists in the database
    const existingUrl = await ShortUrl.findOne({ original_url: originalUrl });
    if (existingUrl) {
      return res.json({
        original_url: existingUrl.original_url,
        short_url: existingUrl.short_url,
      });
    }

    // Create a new short URL
    const shortUrl = new ShortUrl({
      original_url: originalUrl,
      short_url: urlCounter++,
    });

    const data = await shortUrl.save();
    res.json({
      original_url: data.original_url,
      short_url: data.short_url,
    });
  } catch (err) {
    console.error(err);
    res.json({ error: "database error" });
  }
});

app.get("/api/shorturl/:short_url", async (req, res) => {
  const shortUrl = parseInt(req.params.short_url);

  try {
    const data = await ShortUrl.findOne({ short_url: shortUrl });
    if (!data) {
      return res.status(404).json({ error: "not found" });
    }
    res.redirect(data.original_url);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "database error" });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
