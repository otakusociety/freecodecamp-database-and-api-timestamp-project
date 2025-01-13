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


//Build the schema model to store the short URL
var ShortUrl= mongoose.model('ShortUrl', new mongoose.Schema({
  original_url: String,
  short_url: String,
  suffix: String
}));

//parse application/x-www-form-urlencoded

app.use(bodyParser.urlencoded({ extended: false }));
//parse application/json
app.use(bodyParser.json());


// API endpoint to handle URL shortener requests
app.post("/api/shorturl", (req, res) => {
  let originalUrl = req.body.url;
  console.log(`Received URL: ${originalUrl}`);

  let url;
  try {
    url = new URL(originalUrl);
  } catch (error) {
    console.log("Invalid URL encountered.");
    res.json({ error: "invalid url" });
    return;
  }

  let suffix = shortid.generate();
  console.log(`Generated suffix: ${suffix}`);

  let shortUrl = new ShortUrl({
    original_url: originalUrl,
    short_url: suffix,
    suffix: suffix
  });

  // Save the short URL to the database
  (async () => {
    try {
      const data = await shortUrl.save();
      console.log(`Saved short URL: ${data}`);
      res.json({
        original_url: data.original_url,
        short_url: data.short_url,
      });
    } catch (err) {
      console.error(err);
      res.json({ error: "database error" });
    }
  })();
});

// API endpoint to redirect to the original URL
app.get("/api/shorturl/:suffix", async (req, res) => {
  let suffix = req.params.suffix;
  console.log(`Received suffix: ${suffix}`);

  try {
    const data = await ShortUrl.findOne({ suffix: suffix });
    if (!data) {
      res.json({ error: "not found" });
    } else {
      console.log(`Found short URL: ${data}`);
      res.redirect(data.original_url);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "database error" });
  }
});




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


