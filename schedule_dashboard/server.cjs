var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json());
  const presetAssignments = [
    {
      id: "a1",
      employee: "John",
      jobsite: "Mesa",
      startTime: "5:00 AM",
      notes: "follow the leader"
    },
    {
      id: "a2",
      employee: "Tank",
      jobsite: "Spine Lab",
      startTime: "5:00 AM",
      notes: "drill holes"
    },
    {
      id: "a3",
      employee: "Joey",
      jobsite: "Spine Lab",
      startTime: "7:00 AM",
      notes: "drill other holes"
    }
  ];
  function deriveJobsites(assignments) {
    const jobsiteMap = /* @__PURE__ */ new Map();
    assignments.forEach((item) => {
      const name = item.jobsite || "Unknown Jobsite";
      if (!jobsiteMap.has(name)) {
        jobsiteMap.set(name, {
          name,
          assignedWorkersCount: 0,
          assignedStaff: [],
          startTimes: []
        });
      }
      const record = jobsiteMap.get(name);
      record.assignedWorkersCount++;
      if (item.employee && !record.assignedStaff.includes(item.employee)) {
        record.assignedStaff.push(item.employee);
      }
      if (item.startTime && !record.startTimes.includes(item.startTime)) {
        record.startTimes.push(item.startTime);
      }
    });
    return Array.from(jobsiteMap.values()).map((site, index) => ({
      id: `j-${index + 1}`,
      ...site
    }));
  }
  function normalizeAssignment(row, fallbackId) {
    let employee = "";
    let jobsite = "";
    let startTime = "";
    let notes = "";
    if (row && typeof row === "object") {
      const empKey = Object.keys(row).find(
        (k) => k.toLowerCase() === "employee" || k.toLowerCase() === "employeename" || k.toLowerCase() === "worker" || k.toLowerCase() === "employee_name"
      );
      if (empKey) employee = String(row[empKey]).trim();
      const jobKey = Object.keys(row).find(
        (k) => k.toLowerCase() === "jobsite" || k.toLowerCase() === "jobsitename" || k.toLowerCase() === "location" || k.toLowerCase() === "project" || k.toLowerCase() === "jobsite_name"
      );
      if (jobKey) jobsite = String(row[jobKey]).trim();
      const timeKey = Object.keys(row).find(
        (k) => k.toLowerCase() === "start_time" || k.toLowerCase() === "starttime" || k.toLowerCase() === "start time" || k.toLowerCase() === "shift" || k.toLowerCase() === "time" || k.toLowerCase() === "start_period"
      );
      if (timeKey) startTime = String(row[timeKey]).trim();
      const notesKey = Object.keys(row).find(
        (k) => k.toLowerCase() === "notes" || k.toLowerCase() === "note" || k.toLowerCase() === "comment" || k.toLowerCase() === "description"
      );
      if (notesKey) notes = String(row[notesKey]).trim();
    }
    return {
      id: row.id || fallbackId,
      employee: employee || "Unknown Employee",
      jobsite: jobsite || "Unknown Jobsite",
      startTime: startTime || "N/A",
      notes: notes || ""
    };
  }
  app.get("/api/schedule", async (req, res) => {
    const gasUrl = "https://script.google.com/macros/s/AKfycbxCWtwpPs844A-bHlldwy-lDVslphM7lN55T_gTp3F5JwzUZ7hMuvzIPbHhpAE8_TDp/exec";
    try {
      console.log("Fetching live data from GAS Web App...");
      const response = await fetch(gasUrl, {
        method: "GET",
        headers: {
          "Accept": "application/json"
        }
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const text = await response.text();
      if (text.trim().startsWith("<!DOCTYPE") || text.trim().startsWith("<html") || text.includes("<body")) {
        let errDetails = "";
        const divMatch = text.match(/<div style="text-align:center;font-family:monospace;[^"]*">([\s\S]*?)<\/div>/i);
        if (divMatch && divMatch[1]) {
          errDetails = divMatch[1].trim();
        } else {
          const patternMatch = text.match(/(?:ReferenceError|TypeError|Error|Exception|RangeError): [^<]+/i);
          errDetails = patternMatch ? patternMatch[0] : "Google Apps Script internal script execution error";
        }
        errDetails = errDetails.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
        console.warn(`GAS returned HTML instead of JSON: ${errDetails}`);
        return res.json({
          assignments: presetAssignments,
          jobsites: deriveJobsites(presetAssignments),
          isMock: true,
          errorMessage: `The Google Apps Script web app returned a script error: "${errDetails}". Displaying your preset spreadsheet data instead.`
        });
      }
      try {
        const data = JSON.parse(text);
        let rawRows = [];
        if (Array.isArray(data)) {
          rawRows = data;
        } else if (data && typeof data === "object") {
          if (Array.isArray(data.data)) {
            rawRows = data.data;
          } else if (Array.isArray(data.assignments)) {
            rawRows = data.assignments;
          } else if (Array.isArray(data.rows)) {
            rawRows = data.rows;
          } else {
            const foundArray = Object.values(data).find((val) => Array.isArray(val));
            if (foundArray) {
              rawRows = foundArray;
            }
          }
        }
        if (rawRows.length > 0) {
          const parsedAssignments = rawRows.map((row, idx) => normalizeAssignment(row, `a-${idx + 1}`));
          return res.json({
            assignments: parsedAssignments,
            jobsites: deriveJobsites(parsedAssignments),
            isMock: false
          });
        } else {
          console.warn("GAS Web App response did not contain rows. Displaying preset data.");
          return res.json({
            assignments: presetAssignments,
            jobsites: deriveJobsites(presetAssignments),
            isMock: true,
            errorMessage: "No data found in Google Apps Script response. Displaying preset spreadsheet data instead."
          });
        }
      } catch (jsonErr) {
        console.warn(`Failed to parse JSON response from GAS: ${jsonErr.message}`);
        return res.json({
          assignments: presetAssignments,
          jobsites: deriveJobsites(presetAssignments),
          isMock: true,
          errorMessage: `Failed to parse spreadsheet response as JSON. Displaying preset spreadsheet data instead.`
        });
      }
    } catch (error) {
      console.error(`Error during fetching GAS web app: ${error.message}`);
      return res.json({
        assignments: presetAssignments,
        jobsites: deriveJobsites(presetAssignments),
        isMock: true,
        errorMessage: `Failed to connect to the Google Apps Script Web App API. Displaying preset spreadsheet data instead.`
      });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer().catch((err) => {
  console.error("Failed to start server", err);
});
//# sourceMappingURL=server.cjs.map
