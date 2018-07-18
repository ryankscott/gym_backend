const express = require("express");
const _ = require("lodash");
const queries = require("./gym.js");
const morgan = require("morgan");
const cors = require("cors");

var app = express();
app.use(morgan("dev"));
app.use(cors());

app.get("/classes", (req, res: express$Response) => {
  const queryString = req.query;
  const allClasses = queries.queryClasses(queryString);
  res.send(allClasses);
});

app.listen(3000, () => console.log("Example app listening on port 3000!"));
