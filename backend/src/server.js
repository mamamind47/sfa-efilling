const app = require("./app");

const PORT = process.env.PORT || 3000;

// ✅ Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
