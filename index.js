const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

app.use(cors({ optionsSuccessStatus: 200 }));  // some legacy browsers choke on 204
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

app.get("/api/timestamp/:date_string?", (req, res) => {
  let dateString = req.params.date_string;
  console.log(`Received date string: ${dateString}`);

  let date;

  if (!dateString) {
    // If no date string is provided, use the current date
    date = new Date();
  } else {
    // Check if the dateString is a valid Unix timestamp (all digits)
    if (/^\d+$/.test(dateString)) {
      // If it's a valid Unix timestamp, parse it as such
      date = new Date(parseInt(dateString));
    } else {
      // Otherwise, treat it as a human-readable date string
      date = new Date(dateString);
    }
  }

  console.log(`Parsed date: ${date}`);

  // If the date is invalid, send an error response
  if (date.toString() === "Invalid Date") {
    res.json({ error: "Invalid Date" });
  } else {
    // Return the Unix timestamp and UTC string
    res.json({ unix: date.getTime(), utc: date.toUTCString() });
  }
});


// your first API endpoint... 
app.get("/api/hello", function (req, res) {
  console.log({ greeting: "hello API" });
  res.json({ greeting: 'hello API' });
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});