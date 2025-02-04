const conversions = {
  length: {
    metersToFeet: (meters) => meters * 3.28084,
    feetToMeters: (feet) => feet / 3.28084,
    // Add more length conversions here
  },
  area: {
    squareMetersToSquareFeet: (squareMeters) => squareMeters * 10.7639,
    squareFeetToSquareMeters: (squareFeet) => squareFeet / 10.7639,
    // Add more area conversions here
  },
  weight: {
    kilogramsToPounds: (kilograms) => kilograms * 2.20462,
    poundsToKilograms: (pounds) => pounds / 2.20462,
    // Add more weight conversions here
  },
  time: {
    secondsToMinutes: (seconds) => seconds / 60,
    minutesToSeconds: (minutes) => minutes * 60,
    // Add more time conversions here
  },
  volume: {
    litersToGallons: (liters) => liters * 0.264172,
    gallonsToLiters: (gallons) => gallons / 0.264172,
    // Add more volume conversions here
  },
  temperature: {
    celsiusToFahrenheit: (celsius) => (celsius * 9/5) + 32,
    fahrenheitToCelsius: (fahrenheit) => (fahrenheit - 32) * 5/9,
    // Add more temperature conversions here
  },
  cooking: {
    teaspoonsToTablespoons: (teaspoons) => teaspoons / 3,
    tablespoonsToTeaspoons: (tablespoons) => tablespoons * 3,
    // Add more cooking conversions here
  },
  ohmsLaw: {
    voltage: (current, resistance) => current * resistance,
    current: (voltage, resistance) => voltage / resistance,
    resistance: (voltage, current) => voltage / current,
    // Add more Ohm's law conversions here
  }
};

module.exports = conversions;