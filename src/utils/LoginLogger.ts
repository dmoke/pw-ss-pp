import fs from "node:fs";
import path from "node:path";

const AUTH_DIR = path.join(process.cwd(), ".auth");
const LOG_FILE = path.join(AUTH_DIR, "login-log.json");

export interface LoginRecord {
  timestamp: string;
  username: string;
  approach: "session-storage" | "fresh-login";
  testName: string;
  workerIndex: number;
  action: "login" | "reuse";
}

export class LoginLogger {
  static initialize() {
    let created = false;
    if (!fs.existsSync(AUTH_DIR)) {
      fs.mkdirSync(AUTH_DIR, { recursive: true });
      console.log(`[LoginLogger] created auth directory at ${AUTH_DIR}`);
      created = true;
    }
    if (!fs.existsSync(LOG_FILE)) {
      fs.writeFileSync(LOG_FILE, JSON.stringify({ logins: [] }, null, 2));
      console.log(`[LoginLogger] created log file at ${LOG_FILE}`);
      created = true;
    }
    if (!created) {
      console.log(
        `[LoginLogger] initialize called, file already exists at ${LOG_FILE}`,
      );
    }
  }

  static log(record: Omit<LoginRecord, "timestamp">) {
    this.initialize();
    const data = JSON.parse(fs.readFileSync(LOG_FILE, "utf-8"));
    data.logins.push({
      ...record,
      timestamp: new Date().toISOString(),
    });
    fs.writeFileSync(LOG_FILE, JSON.stringify(data, null, 2));
  }

  static getStats() {
    // ensure directory + file exist before reading
    this.initialize();

    const data = JSON.parse(fs.readFileSync(LOG_FILE, "utf-8"));
    const logins = data.logins || [];

    const sessionStorageLogins = logins.filter(
      (l: LoginRecord) => l.approach === "session-storage",
    ).length;
    const freshLoginLogins = logins.filter(
      (l: LoginRecord) => l.approach === "fresh-login",
    ).length;

    return {
      sessionStorageLogins,
      freshLoginLogins,
      total: logins.length,
      logins,
    };
  }

  static clear() {
    // ensure file exists so we can reset it
    this.initialize();
    fs.writeFileSync(LOG_FILE, JSON.stringify({ logins: [] }, null, 2));
  }
}
