const fs = require("fs");

const files = [
  "backend/controllers/chatController.js",
  "backend/routes/chatRoutes.js",
  "frontend/src/context/ChatContext.jsx",
  "frontend/src/pages/Archived.jsx"
];

console.log("\n=== DETAILED SYNTAX CHECK ===\n");

files.forEach(file => {
  console.log(`Checking: ${file}`);
  const content = fs.readFileSync(file, "utf-8");
  const lines = content.split("\n");
  
  let braces = 0, brackets = 0, parens = 0;
  let hasImports = false, hasExports = false;
  
  for (const line of lines) {
    if (line.includes("import") || line.includes("require")) hasImports = true;
    if (line.includes("export") || line.includes("module.exports")) hasExports = true;
    
    for (const char of line) {
      if (char === "{") braces++;
      else if (char === "}") braces--;
      else if (char === "[") brackets++;
      else if (char === "]") brackets--;
      else if (char === "(") parens++;
      else if (char === ")") parens--;
    }
  }
  
  console.log(`  Lines: ${lines.length}`);
  console.log(`  Imports: ${hasImports ? "YES" : "NO"}`);
  console.log(`  Exports: ${hasExports ? "YES" : "NO"}`);
  console.log(`  Bracket balance - {}: ${braces}, []: ${brackets}, (): ${parens}`);
  
  if (braces === 0 && brackets === 0 && parens === 0) {
    console.log("  Status: PASS");
  } else {
    console.log("  Status: SYNTAX ERROR DETECTED");
  }
  console.log();
});
