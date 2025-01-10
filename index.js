const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose")
const MongoDB =require("mongodb")
var bodyParser = require('body-parser');
var shortid = require('shortid');
const dns = require('dns');
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


// Basic Configuration





const urls = [];

app.post('/api/shorturl', (req, res) => {
  let url = req.body.url.replace(/\/*$/, '');
  let validUrl = url.replace(/^https:\/\/(www.)?/, '');
  dns.lookup(validUrl, (err, address, family) => {
    if (err) {
      res.json({ error: 'invalid url' })
    }
    else {
      if (!urls.includes(url)) {
        urls.push(url);
      }
      res.json({
        original_url: url,
        short_url: urls.indexOf(url) + 1
      });
    }
  });
});

app.get('/api/shorturl/:id', (req, res) => {
  const externarlUrl = urls[req.params.id - 1];
  res.redirect(externarlUrl);
});




/*
// Build a schema and model to store the URL data
const ShortURL = new mongoose.model('ShortURL', new mongoose.Schema({
  original_url: String,
  short_url: String,
  suffix: String
}));

// Parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// Parse application/json
app.use(bodyParser.json());

app.post("/api/shorturl", async (req, res) => {

  let originalURL = req.body.url;
  console.log(`Received URL: ${originalURL}`);
  let suffix = shortid.generate();
  console.log(`Generated suffix: ${suffix}`);
  let shortURL = `${req.protocol}://${req.hostname}/api/shorturl/${suffix}`;

  let newURL = new ShortURL({
    original_url: originalURL,
    short_url: shortURL,
    suffix: suffix
  });
  



  try {
    const data = await newURL.save();
    console.log(`Saved URL: ${data}`);
    res.json({
      saved: true,
      original_url: newURL.original_url,
      short_url: newURL.short_url,
      
    });
  } catch (err) {
    console.error(`Error saving URL: ${err}`);
    res.status(500).json({ error: "Failed to save URL" });
  }
});
*/

  /*newURL.save((err, data) => {
    if (err) {
      console.error(`Error saving URL: ${err}`);
    } else {
      console.log(`Saved URL: ${data}`);
      res.json({
        saved: true,
        original_url: newURL.original_url,
        short_url: newURL.short_url,
        suffix: newURL.suffix
      });
    }
  });
  
});

*/



// API endpoint for url shortener






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


