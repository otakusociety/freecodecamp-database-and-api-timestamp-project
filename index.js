const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose")
const MongoDB =require("mongodb")
var bodyParser = require('body-parser');
var shortid = require('shortid');
const dns = require('dns');
const url = require('url');
const multer = require('multer');
const path = require('path');

dotenv.config();

const app = express();

app.use(cors({ optionsSuccessStatus: 200 })); // some legacy browsers choke on 204
app.use(express.static("public"));

// parse application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));
// parse application/json
app.use(express.json());


// Set up multer for file uploads
const upload = multer({ dest: 'uploads/' });

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

  // Check if originalUrl is defined and is a string
  if (!originalUrl || typeof originalUrl !== 'string') {
    console.log("Invalid URL encountered.");
    res.json({ error: "invalid url" });
    return;
  }

  // Parse the URL to get the hostname
  let parsedUrl;
  try {
    parsedUrl = new URL(originalUrl);
  } catch (error) {
    console.log("Invalid URL encountered.");
    res.json({ error: "invalid url" });
    return;
  }

  // Use dns.lookup to verify the hostname
  dns.lookup(parsedUrl.hostname, (err) => {
    if (err) {
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


// Serve the exercise tracker microservice page
app.get("/exercisetracker", (req, res) => {
  res.sendFile(__dirname + '/views/exercisetracker.html');
});

//Build the schema model to store the exercise data
var User = mongoose.model('User', new mongoose.Schema({
  username: String,
  log: [{
    description: String,
    duration: Number,
    date: Date
  }]
}));

// API endpoint to create a new user
app.post("/api/users", async (req, res) => {
  let username = req.body.username;
  console.log(`Received username: ${username}`);
  let user = new User({
    username: username,
    log: []
  });

  try {
    const data = await user.save();
    console.log(`Saved user: ${data}`);
    res.json({ username: data.username, _id: data._id });
  } catch (err) {
    console.error(err);
    res.json({ error: "database error" });
  }
});

// API endpoint to get all users
app.get("/api/users", async (req, res) => {
  try {
    const data = await User.find({}, "_id username");
    console.log(`Found users: ${data}`);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.json({ error: "database error" });
  }
});

// API endpoint to add an exercise
app.post("/api/users/:_id/exercises", async (req, res) => {
  let userId = req.params._id;
  let description = req.body.description;
  let duration = req.body.duration;
  let date = req.body.date;

  console.log(`Received userId: ${userId}`);
  console.log(`Received description: ${description}`);
  console.log(`Received duration: ${duration}`);
  console.log(`Received date: ${date}`);

  if (!date) {
    date = new Date();
  } else {
    date = new Date(date);
  }

  if (date.toUTCString() === "Invalid Date") {
    console.log("Invalid date encountered.");
    res.json({ error: "Invalid Date" });
    return;
  }

  let exercise = {
    description: description,
    duration: parseInt(duration),
    date: date
  };

  try {
    const user = await User.findByIdAndUpdate(
      userId,
      { $push: { log: exercise } },
      { new: true }
    );
    console.log(`Added exercise to user: ${user}`);
    res.json({
      _id: user._id,
      username: user.username,
      date: date.toDateString(),
      duration: parseInt(duration),
      description: description
    });
  } catch (err) {
    console.error(err);
    res.json({ error: "database error" });
  }
});

// API endpoint to get a user's exercise log
app.get("/api/users/:_id/logs", async (req, res) => {
  let userId = req.params._id;
  let from = req.query.from;
  let to = req.query.to;
  let limit = req.query.limit;

  console.log(`Received userId: ${userId}`);
  console.log(`Received from: ${from}`);
  console.log(`Received to: ${to}`);
  console.log(`Received limit: ${limit}`);

  try {
    const user = await User.findById(userId);
    if (!user) {
      res.json({ error: "User not found" });
      return;
    }

    let log = user.log;

    if (from) {
      log = log.filter((exercise) => exercise.date >= new Date(from));
    }

    if (to) {
      log = log.filter((exercise) => exercise.date <= new Date(to));
    }

    if (limit) {
      log = log.slice(0, limit);
    }

    res.json({
      _id: user._id,
      username: user.username,
      count: log.length,
      log: log.map((exercise) => ({
        description: exercise.description,
        duration: exercise.duration,
        date: exercise.date.toDateString()
      }))
    });
  } catch (err) {
    console.error(err);
    res.json({ error: "database error" });
  }
});

// API endpoint to delete a user
app.delete("/api/exercise/delete-user/:userId", async (req, res) => {
  let userId = req.params.userId;
  console.log(`Received userId: ${userId}`);

  try {
    const data = await User.findByIdAndDelete(userId);
    if (!data) {
      res.json({ error: "User not found" });
    } else {
      console.log(`Deleted user: ${data}`);
      res.json({ message: "Deleted user" });
    }
  } catch (err) {
    console.error(err);
    res.json({ error: "database error" });
  }
});

// API endpoint to delete all users
app.delete("/api/exercise/delete-users", async (req, res) => {
  try {
    const data = await User.deleteMany({});
    console.log(`Deleted users: ${data}`);
    res.json({ message: "Deleted users" });
  } catch (err) {
    console.error(err);
    res.json({ error: "database error" });
  }
});

// API endpoint to delete all exercises
app.delete("/api/exercise/delete-exercises", async (req, res) => {
  try {
    const data = await User.updateMany({}, { $set: { log: [] } });
    console.log(`Deleted exercises: ${data}`);
    res.json({ message: "Deleted exercises" });
  } catch (err) {
    console.error(err);
    res.json({ error: "database error" });
  }
});

// API endpoint to delete all exercises for a user
app.delete("/api/exercise/delete-exercises/:userId", async (req, res) => {
  let userId = req.params.userId;
  console.log(`Received userId: ${userId}`);

  try {
    const user = await User.findById(userId);
    if (!user) {
      res.json({ error: "User not found" });
      return;
    }

    user.log = [];
    const data = await user.save();
    console.log(`Deleted exercises for user: ${data}`);
    res.json({ message: "Deleted exercises for user" });
  } catch (err) {
    console.error(err);
    res.json({ error: "database error" });
  }
});

// API endpoint to delete an exercise for a user
app.delete("/api/exercise/delete-exercise/:userId/:exerciseId", async (req, res) => {
  let userId = req.params.userId;
  let exerciseId = req.params.exerciseId;
  console.log(`Received userId: ${userId}`);
  console.log(`Received exerciseId: ${exerciseId}`);

  try {
    const user = await User.findById(userId);
    if (!user) {
      res.json({ error: "User not found" });
      return;
    }

    user.log = user.log.filter((exercise) => exercise._id != exerciseId);
    const data = await user.save();
    console.log(`Deleted exercise for user: ${data}`);
    res.json({ message: "Deleted exercise for user" });
  } catch (err) {
    console.error(err);
    res.json({ error: "database error" });
  }
});

// API endpoint to update an exercise for a user
app.put("/api/exercise/update-exercise/:userId/:exerciseId", async (req, res) => {
  let userId = req.params.userId;
  let exerciseId = req.params.exerciseId;
  let description = req.body.description;
  let duration = req.body.duration;
  let date = req.body.date;

  console.log(`Received userId: ${userId}`);
  console.log(`Received exerciseId: ${exerciseId}`);
  console.log(`Received description: ${description}`);
  console.log(`Received duration: ${duration}`);
  console.log(`Received date: ${date}`);

  if (!date) {
    date = new Date();
  } else {
    date = new Date(date);
  }

  if (date.toUTCString() === "Invalid Date") {
    console.log("Invalid date encountered.");
    res.json({ error: "Invalid Date" });
    return;
  }

  let exercise = {
    description: description,
    duration: parseInt(duration),
    date: date
  };

  try {
    const user = await User.findById(userId);
    if (!user) {
      res.json({ error: "User not found" });
      return;
    }

    user.log = user.log.map((item) => {
      if (item._id == exerciseId) {
        return exercise;
      } else {
        return item;
      }
    });

    const data = await user.save();
    console.log(`Updated exercise for user: ${data}`);
    res.json({ message: "Updated exercise for user" });
  } catch (err) {
    console.error(err);
    res.json({ error: "database error" });
  }
});

// API endpoint to get all exercises
app.get("/api/exercise/exercises", async (req, res) => {
  try {
    const data = await User.find({}, "_id username log");
    console.log(`Found exercises: ${data}`);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.json({ error: "database error" });
  }
});

// API endpoint to get all exercises for a user
app.get("/api/exercise/exercises/:userId", async (req, res) => {
  let userId = req.params.userId;
  console.log(`Received userId: ${userId}`);

  try {
    const user = await User.findById(userId);
    if (!user) {
      res.json({ error: "User not found" });
      return;
    }

    // Assuming the user's exercises are stored in a 'log' field
    res.json({
      _id: user._id,
      username: user.username,
      log: user.log
    });
  } catch (err) {
    console.error(err);
    res.json({ error: "database error" });
  }
});





// Serve the file metadata microservice page
app.get("/filemetadata", (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'filemetadata.html'));
});
// API endpoint to handle file metadata requests
app.post("/api/fileanalyse", upload.single('upfile'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const file = req.file;
  console.log(`Received file: ${file.originalname}`);

  res.json({
    name: file.originalname,
    type: file.mimetype,
    size: file.size
  });
});


  
    

// Serve the timestamp microservice page
app.get("/timestamp", (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'timestamp.html'));
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


