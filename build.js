/* eslint-disable @typescript-eslint/no-var-requires */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function main() {
  try {
    console.log("📦 Building React app with Vite...");
    execSync("npm run build", { stdio: "inherit" });

    console.log("✅ React build completed successfully!");

    const indexHtmlPath = path.join(__dirname, "dist", "index.html");

    // Update paths in the index.html file to work with Electron's file:// protocol
    if (fs.existsSync(indexHtmlPath)) {
      let content = fs.readFileSync(indexHtmlPath, "utf8");
      content = content.replace(/\/assets\//g, "./assets/");
      fs.writeFileSync(indexHtmlPath, content);
      console.log(
        "🔄 Updated asset paths in index.html for Electron compatibility",
      );
    }

    console.log(
      "🚀 Build process completed! The app is ready to run with Electron.",
    );

    // Ask if we should continue to package the app
    rl.question("Do you want to package the app now? (y/n) ", (answer) => {
      if (answer.toLowerCase() === "y") {
        console.log("📦 Packaging app with electron-builder...");
        try {
          execSync("npm run dist", { stdio: "inherit" });
          console.log("✅ Packaging completed successfully!");
        } catch (error) {
          console.error("❌ Packaging failed:", error.message);
        }
      } else {
        console.log(
          "Skipping packaging. Run 'npm run dist' to package the app later.",
        );
      }
      rl.close();
    });
  } catch (error) {
    console.error("❌ Build failed:", error.message);
    rl.close();
    process.exit(1);
  }
}

main();
