import("dashboard/dashboard-server.js")
  .then(() => {
    console.log("✓ dashboard-server.js syntax OK");
    process.exit(0);
  })
  .catch((err) => {
    console.error("✗ Syntax error:", err.message);
    process.exit(1);
  });
