export const TEST_ACCOUNTS = [
  {
    username: "admin",
    password: "AdminPass",
    role: "admin",
    name: "Administrator",
  },
  {
    username: "student",
    password: "Password123",
    role: "student",
    name: "Student User",
  },
  {
    username: "testuser1",
    password: "Password123",
    role: "premium",
    name: "Premium User 1",
  },
  {
    username: "testuser2",
    password: "Password123",
    role: "premium",
    name: "Premium User 2",
  },
  {
    username: "testuser3",
    password: "Password123",
    role: "vip",
    name: "VIP User 3",
  },
  {
    username: "testuser4",
    password: "Password123",
    role: "vip",
    name: "VIP User 4",
  },
];

export const ACCOUNT_USERNAMES = TEST_ACCOUNTS.map((a) => a.username);
