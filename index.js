const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
var bodyParser = require("body-parser");
var shortid = require("shortid");

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

app.get("/reverse", (req, res) => {
  res.sendFile(__dirname + "/views/headerparser.html");
});

app.get("/api/whoami", (req, res) => {
  res.json({
    ipaddress: req.ip,
    language: req.headers["accept-language"],
    software: req.headers["user-agent"],
  });
});

app.get("/urlshortener", (req, res) => {
  res.sendFile(__dirname + "/views/urlshortener.html");
});

const ShortUrl = mongoose.model(
  "ShortUrl",
  new mongoose.Schema({
    original_url: String,
    short_url: String,
    suffix: String,
  })
);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

function isValidUrl(url) {
  const regex = /^(https?:\/\/)(www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}.*$/;
  return regex.test(url);
}

app.post("/api/shorturl", async (req, res) => {
  let originalUrl = req.body.url;

  if (!isValidUrl(originalUrl)) {
    return res.json({ error: "invalid url" });
  }

  const suffix = shortid.generate();
  const shortUrl = new ShortUrl({
    original_url: originalUrl,
    short_url: suffix,
    suffix: suffix
  });

  try {
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

app.get("/api/shorturl/:suffix", async (req, res) => {
  const { suffix } = req.params;

  try {
    const data = await ShortUrl.findOne({ suffix });
    if (!data) {
      return res.status(404).json({ error: "not found" });
    }
    res.redirect(data.original_url);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "database error" });
  }
});

app.get("/timestamp", (req, res) => {
  res.sendFile(__dirname + "/views/timestamp.html");
});

app.get("/api/:date?", (req, res) => {
  let dateParam = req.params.date;
  let date;

  if (!dateParam) {
    date = new Date();
  } else if (/^\d{5,}$/.test(dateParam)) {
    date = new Date(parseInt(dateParam));
  } else {
    date = new Date(dateParam);
  }

  if (date.toUTCString() === "Invalid Date") {
    res.json({ error: "Invalid Date" });
  } else {
    res.json({ unix: date.getTime(), utc: date.toUTCString() });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
