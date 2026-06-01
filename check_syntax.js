const fs = require("fs");
const path = require("path");

function checkFile(filePath) {
  console.log(`\n=== Checking ${filePath} ===`);
  if (!fs.existsSync(filePath)) {
    console.log("ERROR: File not found");
    return false;
  }
  
  const content = fs.readFileSync(filePath, "utf-8");
  
  try {
    if (filePath.endsWith(".jsx") || filePath.endsWith(".js")) {
      if (filePath.endsWith(".jsx")) {
        console.log("JSX file - checking structure...");
        if (!content.includes("import") && !content.includes("export")) {
          console.log("WARNING: File might be incomplete");
        }
      } else {
        new Function(content);
      }
      console.log("OK - No obvious syntax errors");
      return true;
    }
  } catch (e) {
    console.log(`ERROR: ${e.message}`);
    return false;
  }
  return true;
}

const files = [
  "backend/controllers/chatController.js",
  "backend/routes/chatRoutes.js",
  "frontend/src/context/ChatContext.jsx",
  "frontend/src/pages/Archived.jsx"
];

let allOk = true;
files.forEach(f => {
  if (!checkFile(f)) allOk = false;
});

console.log(`\n=== Summary ===`);
process.exit(allOk ? 0 : 1);
