const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

app.use(cors({ optionsSuccessStatus: 200 })); // some legacy browsers choke on 204
app.use(express.static("public"));

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

// API endpoint for shorturl
app.post("/api/shorturl", (req, res) => {
  console.log("Shortening URL");
  res.json({ error: "Not yet implemented" });
  console.log({error: "Not yet implemented"});

});



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


