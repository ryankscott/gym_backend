// @flow

const fetch = require("node-fetch");
const low = require("lowdb");
const _ = require("lodash");
const FileSync = require("lowdb/adapters/FileSync");
const parse = require("date-fns/parse");
const addDays = require("date-fns/addDays");
const subDays = require("date-fns/subDays");
const subHours = require("date-fns/subHours");
const isBefore = require("date-fns/isBefore");
const isAfter = require("date-fns/isAfter");
const getHours = require("date-fns/getHours");
const isSameDay = require("date-fns/isSameDay");

const { logger } = require("./logger.js");

// TODO:

const saveEntities = (db, jsonClasses) => {
  const startTime = new Date();
  let classes = _.get(jsonClasses, "Classes");
  logger.log("info", "Saving %d classes", classes.length);

  let trainers = _.get(jsonClasses, "Trainers");
  logger.log("info", "Saving %d trainers", trainers.length);

  let classTypes = _.get(jsonClasses, "ClassType");
  logger.log("info", "Saving %d class types", classTypes.length);

  _.map(classes, c => {
    saveClasses(db, c);
  });
  _.map(trainers, t => {
    saveTrainers(db, t);
  });

  _.map(classTypes, ct => {
    saveClassTypes(db, ct);
  });
  const endTime = new Date();
  const duration = (endTime - startTime) / 1000;
  logger.log("info", "Saved all classes in %d s", duration);
};

const saveClasses = (db, c) => {
  db.get("classes")
    .push(c)
    .write();
};

const saveTrainers = (db, c) => {
  db.get("trainers")
    .push(c)
    .write();
};

const saveClassTypes = (db, c) => {
  db.get("classTypes")
    .push(c)
    .write();
};

const classTransformer = inputClass => {
  return {
    gym: {
      key: inputClass.Club.ClubCode,
      name: inputClass.Club.Name
    },
    class: {
      key: inputClass.ClassCode,
      name: inputClass.ClassName
    },
    duration: inputClass.Duration,
    instructor: {
      key: inputClass.MainInstructor.InstructorId,
      name: inputClass.MainInstructor.Name
    },
    isVirtualClass: inputClass.IsVirtualClass,
    intensity: inputClass.Intensity,
    startDateTime: inputClass.StartDateTime
  };
};

const classTypeTransformer = inputClassType => {
  return {
    key: inputClassType.Key,
    name: inputClassType.Value
  };
};

const queryAllClasses = db => {
  return db.get("classes").value();
};

const queryClassTypes = db => {
  const allClassTypes = db.get("classTypes").value();
  const transformedClassTypes = _.map(allClassTypes, classTypeTransformer);
  return transformedClassTypes;
};

const queryClasses = (db, query) => {
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
  logger.log("debug", "Parsed names query parameter as %s", names);
  const classesByName = queryClassesByName(db, ...names);
  logger.log(
    "debug",
    "Returned %d classes from name query",
    classesByName.length
  );

  let clubs = club ? club.split(",") : [];
  clubs = _.map(clubs, c => c.toLowerCase());
  logger.log("debug", "Parsed clubs query parameter as %s", clubs);
  const classesByClub = queryClassesByClub(db, ...clubs);
  logger.log(
    "debug",
    "Returned %d classes from club query",
    classesByClub.length
  );

  let dates = date ? date.split(",") : [];
  logger.log("debug", "Parsed dates query parameter as %s", dates);
  const classesByDate = queryClassesByDate(db, ...dates);
  logger.log(
    "debug",
    "Returned %d classes from date query",
    classesByDate.length
  );

  // Here be dragons - I assume this is in NZT!!
  let hours = hour ? hour.split(",") : [];
  hours = _.map(hours, hour => {
    return parseInt(hour, 10);
  });
  logger.log("debug", "Parsed hours query parameter as %s", hours);
  const classesByHour = queryClassesByHour(db, ...hours);
  logger.log(
    "debug",
    "Returned %d classes from hour query",
    classesByHour.length
  );

  const allClasses = _.intersection(
    classesByName,
    classesByClub,
    classesByDate,
    classesByHour
  );
  logger.log("debug", "Returned %d combined classes", allClasses.length);

  const transformedClasses = _.map(allClasses, classTransformer);
  const recentClasses = _.filter(transformedClasses, c => {
    return isAfter(c.startDateTime, new Date());
  });
  return _.sortBy(recentClasses, ["startDateTime"]);
};

const queryClassesByName = (db, ...id) => {
  if (id.length == 0) {
    logger.log("debug", "Returning all classes as no names parameter passed");
    return queryAllClasses(db);
  }
  return db
    .get("classes")
    .filter(c => {
      return _.indexOf(id, c.ClassCode) >= 0;
    })
    .value();
};

const queryClassesByDate = (db, ...dates) => {
  if (dates.length == 0) {
    logger.log("debug", "Returning all classes as no dates parameter passed");
    return queryAllClasses(db);
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

const queryClassesByHour = (db, ...hours) => {
  if (hours.length == 0) {
    logger.log("debug", "Returning all classes as no hours parameter passed");
    return queryAllClasses(db);
  }

  return db
    .get("classes")
    .filter(c => {
      return _.indexOf(hours, getHours(c.StartDateTime)) >= 0;
    })
    .value();
};

const queryClassesByClub = (db, ...club) => {
  if (club.length == 0) {
    logger.log("debug", "Returning all classes as no club parameter passed");
    return queryAllClasses(db);
  }
  return db
    .get("classes")
    .filter(c => {
      return _.indexOf(club, c.Club.ClubCode) >= 0;
    })
    .value();
};

const queryClassesByVirtual = (db, isVirtual) => {
  return db
    .get("classes")
    .filter(c => {
      return c.IsVirtualClass === isVirtual;
    })
    .value();
};

const deleteEntities = db => {
  deleteClasses(db);
  deleteClassTypes(db);
  deleteTrainers(db);
};

const deleteTrainers = db => {
  return db
    .get("trainers")
    .remove()
    .write();
};

const deleteClassTypes = db => {
  return db
    .get("classTypes")
    .remove()
    .write();
};

const deleteClasses = db => {
  logger.log("info", "Removing all classes");
  return db
    .get("classes")
    .remove()
    .write();
};

const deleteOldClasses = db => {
  return db
    .get("classes")
    .remove(c => {
      isBefore(c.StartDateTime, subHours(new Date(), 7));
    })
    .write();
};

const getClasses = db => {
  // First delete all class types
  logger.log("info", "Deleting old class types");
  deleteClassTypes(db);

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
      saveEntities(db, json);
    })

    .catch(err => logger.log("err", "Failed to fetch classes from LM %s", err));

  deleteOldClasses(db);
};

const createDB = fileName => {
  const adapter = new FileSync(fileName);
  return low(adapter);
};

const createDefaultTables = db => {
  db.defaults({ classes: [], trainers: [], classTypes: [] }).write();
};

const deleteDB = db => {};

module.exports = {
  saveEntities,
  deleteEntities,
  deleteOldClasses,
  queryClasses,
  queryClassesByName,
  queryClassesByDate,
  queryClassesByHour,
  queryClassesByClub,
  queryClassTypes,
  getClasses,
  deleteClasses,
  createDefaultTables,
  createDB,
  deleteDB
};
