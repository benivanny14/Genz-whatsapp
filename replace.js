const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

async function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace '/api/ with '/
  let newContent = content.replace(/'\/api\//g, "'/");
  // Replace `/api/ with `/
  newContent = newContent.replace(/`\/api\//g, "`/");
  // Replace BACKEND_URL}/api/ with BACKEND_URL}/
  newContent = newContent.replace(/BACKEND_URL}\/api\//g, "BACKEND_URL}/");
  // Replace API_URL}/api/ with API_URL}/
  newContent = newContent.replace(/API_URL}\/api\//g, "API_URL}/");
  
  // Specific for ChatContext line 18 BACKEND_URL
  if (filePath.includes('ChatContext.jsx')) {
    newContent = newContent.replace(/const BACKEND_URL = 'https:\/\/genz-whatsapp.onrender.com';/g, "const BACKEND_URL = import.meta.env.VITE_API_URL || 'https://genz-whatsapp.onrender.com/api';");
  }

  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log('Updated', filePath);
  }
}

async function scanAndReplace(dir) {
  const files = await readdir(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const fileStat = await stat(filePath);
    if (fileStat.isDirectory()) {
      await scanAndReplace(filePath);
    } else if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
      await replaceInFile(filePath);
    }
  }
}

async function main() {
  await scanAndReplace('./frontend/src/services');
  await scanAndReplace('./frontend/src/context');
}

main().catch(console.error);
