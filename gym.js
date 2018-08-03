const fetch = require("node-fetch");
const low = require("lowdb");
const _ = require("lodash");
const FileSync = require("lowdb/adapters/FileSync");
const parse = require("date-fns/parse");
const addDays = require("date-fns/addDays");
const subDays = require("date-fns/subDays");
const isBefore = require("date-fns/isBefore");
const isAfter = require("date-fns/isAfter");
const getHours = require("date-fns/getHours");
const adapter = new FileSync("db.json");
const isSameDay = require("date-fns/isSameDay");
const db = low(adapter);

const { logger } = require("./logger.js");

let saveEntityFunc = (entity, c) => {
  db
    .get(entity)
    .push(c)
    .write();
};

let saveEntity = _.curry(saveEntityFunc);
const saveClass = saveEntity("classes");
const saveTrainers = saveEntity("trainers");
const saveClassType = saveEntity("classType");

const classFilter = inputClass => {
  return {
    Club: inputClass.Club,
    ClassName: inputClass.ClassName,
    StartDateTime: inputClass.StartDateTime
  };
};

const queryClassTypes = () => {
  return db.get("classType").value();
};

const queryClasses = query => {
  /* Should expect an object that looks like
     *  {
     *     name: "BodyPump, RPM"
     *     club: "Auckland City"
     *     date: "2018-07-18T19:10:00Z12:00,2018-07-18T20:10:00Z12:00",
     *     hour: "6,7,8,9,10" 
     *  }
     */

  const name = _.get(query, "name");
  const club = _.get(query, "club");
  const date = _.get(query, "date");
  const hour = _.get(query, "hour");

  let names = name ? name.split(",") : [];
  names = _.map(names, n => n.toLowerCase());
  const classesByName = queryClassesByName(...names);

  let clubs = club ? club.split(",") : [];
  clubs = _.map(clubs, c => c.toLowerCase());
  const classesByClub = queryClassesByClub(...clubs);

  let dates = date ? date.split(",") : [];
  const classesByDate = queryClassesByDate(...dates);

  // Here be dragons - I assume this is in NZT!!
  let hours = hour ? hour.split(",") : [];
  hours = _.map(hours, hour => {
    return parseInt(hour, 10);
  });
  const classesByHour = queryClassesByHour(...hours);

  const allClasses = _.intersection(
    classesByName,
    classesByClub,
    classesByDate,
    classesByHour
  );
  const reducedClasses = _.map(allClasses, classFilter);
  return _.sortBy(reducedClasses, ["StartDateTime"]);
};

const queryAllClasses = () => {
  return db.get("classes").value();
};

const queryClassesByName = (...id) => {
  if (id.length == 0) {
    return queryAllClasses();
  }
  return db
    .get("classes")
    .filter(c => {
      return _.indexOf(id, c.ClassCode) >= 0;
    })
    .value();
};

const queryClassesByDate = (...dates) => {
  if (dates.length == 0) {
    return queryAllClasses();
  }
  return db
    .get("classes")
    .filter(c => {
      const sameDays = _.map(dates, date => {
        return isSameDay(date, c.StartDateTime);
      });
      return _.indexOf(sameDays, true) >= 0;
    })
    .value();
};

const queryClassesByHour = (...hours) => {
  if (hours.length == 0) {
    return queryAllClasses();
  }

  return db
    .get("classes")
    .filter(c => {
      return _.indexOf(hours, getHours(c.StartDateTime)) >= 0;
    })
    .value();
};

const queryClassesByClub = (...club) => {
  if (club.length == 0) {
    return queryAllClasses();
  }
  return db
    .get("classes")
    .filter(c => {
      return _.indexOf(club, c.Club.ClubCode) >= 0;
    })
    .value();
};

const removeClassTypes = () => {
  return db
    .get("classType")
    .remove()
    .write();
};
const removeClasses = () => {
  logger.log("info", "Removing all classes");
  return db
    .get("classes")
    .remove()
    .write();
};
const removeOldClasses = () => {
  return db
    .get("classes")
    .remove(c => {
      moment(c.StartDateTime).isBefore(moment().subtract(7, "days"));
    })
    .write();
};

const saveClasses = jsonClasses => {
  let classes = _.get(jsonClasses, "Classes");
  const startTime = new Date();
  logger.log("info", "Saving %d classes", classes.length);
  let trainers = _.get(jsonClasses, "Trainers");
  let classType = _.get(jsonClasses, "ClassType");
  _.map(classes, saveClass);
  _.map(trainers, saveTrainers);
  _.map(classType, saveClassType);
  const endTime = new Date();
  const duration = (endTime - startTime) / 1000;
  logger.log("info", "Saved all classes in %d s", duration);
};

const getClasses = () => {
  logger.log("info", "Fetching new classes");
  const startTime = new Date();
  fetch("https://www.lesmills.co.nz/api/timetable/get-timetable-epi", {
    method: "POST",
    body: "Club=01,09,13,06",
    headers: { "Content-Type": "application/x-www-form-urlencoded" }
  })
    .then(res => res.json())
    .then(json => {
      const endTime = new Date();
      const duration = (endTime - startTime) / 1000;
      logger.log("info", "Fetched all classes in %d s", duration);
      saveClasses(json);
    })

    .catch(err => console.log(err));

  removeOldClasses();
};

const createTables = () => {
  db.defaults({ classes: [], trainers: [], classType: [] }).write();
};

module.exports = {
  saveClasses,
  removeClasses,
  removeOldClasses,
  queryClasses,
  queryClassesByName,
  queryClassTypes,
  getClasses,
  removeClasses,
  createTables
};
