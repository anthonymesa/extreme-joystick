const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ruleFile = "/etc/udev/rules.d/99-joystick.rules";
const udevScript = path.join(__dirname, "install-udev.sh");

function ruleExists() {
  try {
    return fs.existsSync(ruleFile);
  } catch {
    return false;
  }
}

if (proces.platform === "linux") {
	(async () => {
		  if (ruleExists()) {
			    console.log("udev rule already installed.");
			    return;
		  }

		  console.log("\n🚀  Joystick Library Setup");
		  console.log("This library needs a udev rule to access HID devices without sudo.");
		  console.log("We can install it automatically (requires sudo).");

		  // Ask the user
		  const readline = require("readline").createInterface({
			    input: process.stdin,
			    output: process.stdout,
		  });

		  readline.question("Install udev rule now? (y/n): ", async answer => {
			    readline.close();

			    if (!answer.match(/^y(es)?$/i)) {
				      console.log("Skipping udev rule installation. You will need sudo to run joystick apps.");
				      return;
			    }

			    try {
				      console.log("\nRequesting sudo to install udev rule...");
				      execSync("sudo ./install-udev.sh", { stdio: "inherit" });
			    } catch (err) {
				      console.error("Failed to install udev rule:", err.message);
			    }
		  });
	})();
} else {
	console.log("Skipping udev rules installation (non-Linux OS detected)");
}

