const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const app = express();

const dbPath = path.join(__dirname, "covid19India.db");
app.use(express.json());

let db = null;
const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000");
    });
  } catch (error) {
    console.log(`DB Error: ${error}`);
    process.exit(1);
  }
};
initializeDbAndServer();

//1. GET Returns a list of all states in the state table

const convertDbStates = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  };
};

app.get("/states/", async (request, response) => {
  const getStatesQuery = `SELECT * FROM state ORDER BY state_id;`;
  const responseQuery = await db.all(getStatesQuery);
  response.send(responseQuery.map((eachState) => convertDbStates(eachState)));
});

//2. GET Returns a state based on the state ID
app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const getStateQuery = `SELECT * FROM state WHERE state_id = ${stateId};`;
  const responseQuery = await db.get(getStateQuery);
  response.send(convertDbStates(responseQuery));
});

//3. GET Returns a district based on the district ID

const convertDbDistricts = (dbObject) => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};

app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictQuery = `SELECT * FROM district WHERE district_id=${districtId};`;
  const responseQuery = await db.get(getDistrictQuery);
  response.send(convertDbDistricts(responseQuery));
});

//4. GET Returns the statistics of a specific state based on state ID

app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const getStatsQuery = `SELECT
  SUM(cases) AS totalCases, 
  SUM(cured) AS totalCured,
  SUM(active) AS totalActive, 
  SUM(deaths) AS totalDeaths
  FROM district WHERE state_id = ${stateId};`;
  const responseQuery = await db.get(getStatsQuery);
  response.send(responseQuery);
});

//5. GET Returns an object containing the state name of a district based on the district ID
app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictIdQuery = `SELECT state_id FROM district WHERE district_id=${districtId};`;
  const responseQuery = await db.get(getDistrictIdQuery);

  const getStateNameQuery = `SELECT state_name AS stateName FROM state
  WHERE state_id=${responseQuery.state_id};`;
  const responseStateName = await db.get(getStateNameQuery);
  response.send(responseStateName);
});

//6. POST create new district name
app.post("/districts/", async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const newDistrictName = `INSERT INTO 
    district(district_name, state_id, cases, cured, active, deaths)
    VALUES('${districtName}',${stateId},${cases},${cured},${active},${deaths});`;
  const responseQuery = await db.run(newDistrictName);
  response.send("District Successfully Added");
});

//7. PUT Updates the details of a specific district based on the district ID
app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const updateQuery = `UPDATE district SET
    district_name = '${districtName}',
    state_id = ${stateId}, cases = ${cases}, cured = ${cured},
    active = ${active}, deaths = ${deaths} WHERE district_id = ${districtId};`;
  const responseQuery = await db.run(updateQuery);
  response.send("District Details Updated");
});

//8. delete district
app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteQuery = `DELETE FROM district WHERE district_id=${districtId};`;
  const responseQuery = await db.run(deleteQuery);
  response.send("District Removed");
});

module.exports = app;
