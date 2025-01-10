const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose")
const MongoDB =require("mongodb")
var bodyParser = require('body-parser');
var shortid = require('shortid');

dotenv.config();

const app = express();

app.use(cors({ optionsSuccessStatus: 200 })); // some legacy browsers choke on 204
app.use(express.static("public"));

// parse application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));
// parse application/json
app.use(express.json());

const uri = process.env.MONGO_URI;

const clientOptions = {
  serverApi: { version: "1", strict: true, deprecationErrors: true },
};

async function run() {
  try {
    // Create a Mongoose client with a MongoClientOptions object to set the Stable API version
    await mongoose.connect(uri, clientOptions);
    await mongoose.connection.db.admin().command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } catch (error) {
    console.error("Failed to connect to MongoDB", error);
  }
}
run().catch(console.dir);


// Root route to serve the index.html file
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/home.html");
});


// API endpoint for hello
app.get("/api/hello", function (req, res) {
  console.log({ greeting: "hello API" });
  res.json({ greeting: "hello API" });
});


// Serve the header parser microservice page
app.get("/reverse", (req, res) => {
  res.sendFile(__dirname + '/views/headerparser.html');
});
// API endpoint for whoami
app.get("/api/whoami", (req, res) => {
  console.log({
    ipaddress: req.ip,
    language: req.headers["accept-language"],
    software: req.headers["user-agent"],
  });
  res.json({
    ipaddress: req.ip,
    language: req.headers["accept-language"],
    software: req.headers["user-agent"],
  });
});

// Serve the url shortener microservice page
app.get("/urlshortener", (req, res) => {
  res.sendFile(__dirname + '/views/urlshortener.html');
});


// Build a schema and model to store the original URL and the shortened URL
const shortUrlSchema = new mongoose.Schema({
  original_url: String,
  short_url: String,
  suffix: String
});

const ShortUrl = mongoose.model("ShortUrl", shortUrlSchema);

// Improved URL validation function
const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch (err) {
    return false;
  }
};

// Normalize URL function
const normalizeUrl = (url) => {
  if (!/^https?:\/\//i.test(url)) {
    url = 'http://' + url;
  }
  return url;
};

// API endpoint for shorturl
app.post("/api/shorturl", async (req, res) => {
  let client_requested_url = req.body.url;
  console.log(`Received URL: ${client_requested_url}`);

  client_requested_url = normalizeUrl(client_requested_url);

  if (!isValidUrl(client_requested_url)) {
    console.log("Invalid URL");
    return res.status(400).json({ error: "Invalid URL" });
  }

  let suffix = shortid.generate();
  let newShortUrl = new ShortUrl({ original_url: client_requested_url, short_url: suffix, suffix });

  try {
    await newShortUrl.save();
    const shortUrl = `${req.protocol}://${req.get('host')}/api/shorturl/${suffix}`;
    res.json({ Original_url: client_requested_url, Short_url: shortUrl });
  } catch (error) {
    console.error("Failed to save the URL", error);
    res.status(500).json({ error: "Failed to save the URL" });
  }
});

// API endpoint to redirect to the original URL
app.get("/api/shorturl/:short_url", async (req, res) => {
  let short_url = req.params.short_url;
  console.log(`Received short URL: ${short_url}`);

  try {
    let urlEntry = await ShortUrl.findOne({ short_url });
    if (urlEntry) {
      res.redirect(urlEntry.original_url);
    } else {
      res.status(404).json({ error: "No short URL found for the given input" });
    }
  } catch (error) {
    console.error("Error finding the short URL", error);
    res.status(500).json({ error: "Failed to find the URL" });
  }
});

// API endpoint to get all short URLs




/*// Serve the exercise tracker microservice page
app.get("/exercise", (req, res) => {
  res.sendFile(__dirname + '/views/exercisetracker.html');
});*/




// Serve the timestamp microservice page
app.get("/timestamp", (req, res) => {
  res.sendFile(__dirname + '/views/timestamp.html');
});
// API endpoint to handle timestamp requests
app.get("/api/:date?", (req, res) => {
  let dateParam = req.params.date;
  console.log(`Received date parameter: ${dateParam}`);

  let date;

  if (!dateParam) {
    date = new Date();
    console.log("No date parameter provided, using current date.");
  } else if (/^\d{5,}$/.test(dateParam)) {
    date = new Date(parseInt(dateParam));
    console.log(`Interpreted as Unix timestamp: ${date}`);
  } else {
    date = new Date(dateParam);
    console.log(`Interpreted as date string: ${date}`);
  }

  if (date.toUTCString() === "Invalid Date") {
    console.log("Invalid date encountered.");
    res.json({ error: "Invalid Date" });
  } else {
    console.log(
      `Returning date response: Unix=${date.getTime()}, UTC=${date.toUTCString()}`
    );
    res.json({ unix: date.getTime(), utc: date.toUTCString() });
  }
});

// Catch-all route for unmatched paths
app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});


