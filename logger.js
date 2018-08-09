const { createLogger, format, transports } = require("winston");
const { splat, combine, timestamp, colorize, prettyPrint, printf } = format;

// Logging
const tsFormat = () => new Date().toLocaleTimeString();
const logger = createLogger({
  level: "error",
  transports: [
    new transports.Console({
      format: combine(
        timestamp(tsFormat),
        splat(),
        colorize(),
        printf(info => `${info.timestamp} - ${info.level} - ${info.message}`)
      )
    })
  ]
});

module.exports.logger = logger;
