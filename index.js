const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const MongoDB = require("mongodb");
const bodyParser = require('body-parser');
const shortid = require('shortid');
const dns = require('dns');
const url = require('url');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');
const conversions = require('./conversions');
const axios = require("axios");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");

dotenv.config();

const app = express();

app.use(cors({ optionsSuccessStatus: 200 })); // some legacy browsers choke on 204
app.use(express.static("public"));

// parse application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));
// parse application/json
app.use(express.json());

// Swagger setup
const swaggerOptions = {
  swaggerDefinition: {
    openapi: "3.0.0",
    info: {
      title: "Microservices API",
      version: "1.0.0",
      description: "API documentation for the microservices",
    },
    servers: [
      {
        url: "http://localhost:3000",
      },
    ],
  },
  apis: ["./index.js", "./swaggerDocs.js"], // Path to the API docs
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

let highscore = 0;

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


const fileSchema = new mongoose.Schema({
  originalname: String,
  mimetype: String,
  size: Number,
  path: String
});

const File = mongoose.model('File', fileSchema);



// Serve the QR code generator page
app.get("/qrcode", (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'qrcode.html'));
});

// API endpoint to generate QR code
app.post("/api/qrcode", async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: "No URL provided" });
  }

  try {
    const qrCodeDataURL = await QRCode.toDataURL(url);
    res.json({ qrCode: qrCodeDataURL });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate QR code" });
  }
});



// Serve the file metadata microservice page
app.get("/filemetadata", (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'filemetadata.html'));
});
// API endpoint to handle file metadata requests
app.post("/file-metadata/api/fileanalyse", upload.single('upfile'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const file = req.file;
  console.log(`Received file: ${file.originalname}`);

  // Save file metadata to the database
  const newFile = new File({
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    path: file.path
  });

  try {
    const savedFile = await newFile.save();
    res.json({
      name: savedFile.originalname,
      type: savedFile.mimetype,
      size: savedFile.size,
      id: savedFile._id
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// API endpoint to download a file by ID
app.get("/file-metadata/api/file/:id", async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    res.download(file.path, file.originalname);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// Middleware to prefix /file-metadata to the routes
app.use('/file-metadata', (req, res, next) => {
  req.url = req.url.replace('/file-metadata', '');
  next();
});


// Serve the unit converter page
app.get("/unitconverter", (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'unitconverter.html'));
});

// API endpoint to handle unit conversion requests
app.post("/api/convert", (req, res) => {
  const { category, conversion, value } = req.body;
  if (!category || !conversion || value === undefined) {
    return res.status(400).json({ error: "Invalid request" });
  }

  try {
    const conversionFunction = conversions[category][conversion];
    if (!conversionFunction) {
      return res.status(400).json({ error: "Conversion not supported" });
    }

    const result = conversionFunction(parseFloat(value));
    res.json({ result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to convert units" });
  }
});

// API endpoint to get conversion options
app.get("/api/conversion-options", (req, res) => {
  const options = {};
  for (const category in conversions) {
    options[category] = Object.keys(conversions[category]).map(key => ({
      value: key,
      text: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
    }));
  }
  res.json(options);
});


// Serve the currency converter page
app.get("/currencyconverter", (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'currencyconverter.html'));
});

// API endpoint to get currency conversion options
app.get("/api/currency-options", (req, res) => {
  const currencies = [
    { code: "USD", name: "American Dollar" },
    { code: "GHS", name: "Ghana Cedi" },
    { code: "GBP", name: "British Pound" },
    { code: "INR", name: "Indian Rupee" },
    { code: "ZAR", name: "South African Rand" },
    { code: "JPY", name: "Japanese Yen" },
    { code: "EUR", name: "Euro" },
    // Add more currencies here
  ];
  res.json(currencies);
});

// API endpoint to handle currency conversion requests
app.post("/api/convertcurrency", async (req, res) => {
  const { from, to, amount } = req.body;
  if (!from || !to || amount === undefined) {
    return res.status(400).json({ error: "Invalid request" });
  }

  try {
    const response = await axios.get(`https://v6.exchangerate-api.com/v6/YOUR_API_KEY/latest/${from}`);
    const rate = response.data.conversion_rates[to];
    if (!rate) {
      return res.status(400).json({ error: "Conversion not supported" });
    }

    const result = rate * parseFloat(amount);
    res.json({ result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to convert currency" });
  }
});

// Serve the calculator page
app.get("/calculator", (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'calculator.html'));
});

// API endpoint to handle calculator requests
app.post("/api/calculate", (req, res) => {
  const { operation, num1, num2 } = req.body;
  if (!operation || num1 === undefined || num2 === undefined) {
    return res.status(400).json({ error: "Invalid request" });
  }

  const n1 = parseFloat(num1);
  const n2 = parseFloat(num2);
  let result;

  switch (operation) {
    case "add":
      result = n1 + n2;
      break;
    case "subtract":
      result = n1 - n2;
      break;
    case "multiply":
      result = n1 * n2;
      break;
    case "divide":
      if (n2 === 0) {
        return res.status(400).json({ error: "Cannot divide by zero" });
      }
      result = n1 / n2;
      break;
    default:
      return res.status(400).json({ error: "Invalid operation" });
  }

  res.json({ result });
});


// Serve the Snake game page
app.get("/snake", (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'snake.html'));
});

// API endpoint to get the highscore
app.get("/api/highscore", (req, res) => {
  res.json({ highscore });
});

// API endpoint to update the highscore
app.post("/api/highscore", (req, res) => {
  const { score } = req.body;
  if (score > highscore) {
    highscore = score;
  }
  res.json({ highscore });
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



