import fs from "node:fs";
import path from "node:path";

const AUTH_DIR = path.join(process.cwd(), ".auth");
const LOG_FILE = path.join(AUTH_DIR, "login-log.json");


export interface LoginRecord {
  timestamp: string;
  username: string;
  approach: 'session-storage' | 'fresh-login';
  testName: string;
  workerIndex: number;
  action: 'login' | 'reuse';
}

export class LoginLogger {
  static initialize() {
    if (!fs.existsSync(AUTH_DIR)) {
      fs.mkdirSync(AUTH_DIR, { recursive: true });
    }
    if (!fs.existsSync(LOG_FILE)) {
      fs.writeFileSync(LOG_FILE, JSON.stringify({ logins: [] }, null, 2));
    }
  }

  static log(record: Omit<LoginRecord, 'timestamp'>) {
    this.initialize();
    const data = JSON.parse(fs.readFileSync(LOG_FILE, 'utf-8'));
    data.logins.push({
      ...record,
      timestamp: new Date().toISOString(),
    });
    fs.writeFileSync(LOG_FILE, JSON.stringify(data, null, 2));
  }

  static getStats() {
    if (!fs.existsSync(LOG_FILE)) {
      return { sessionStorageLogins: 0, freshLoginLogins: 0, total: 0 };
    }
    
    const data = JSON.parse(fs.readFileSync(LOG_FILE, 'utf-8'));
    const logins = data.logins || [];
    
    const sessionStorageLogins = logins.filter((l: LoginRecord) => l.approach === 'session-storage').length;
    const freshLoginLogins = logins.filter((l: LoginRecord) => l.approach === 'fresh-login').length;
    
    return {
      sessionStorageLogins,
      freshLoginLogins,
      total: logins.length,
      logins,
    };
  }

  static clear() {
    if (fs.existsSync(LOG_FILE)) {
      fs.writeFileSync(LOG_FILE, JSON.stringify({ logins: [] }, null, 2));
    }
  }
}
