const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../config/database");

exports.registerUser = async (req, res) => {
  const { username, password, role } = req.body;

  try {
    const existingUser = await prisma.users.findUnique({ where: { username } });
    if (existingUser)
      return res.status(400).json({ error: "Username already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await prisma.users.create({
      data: { username, password: hashedPassword, role: role || "student" },
    });

    res.json({ message: "User registered successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message || "Server error" });
  }
};

exports.loginUser = async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await prisma.users.findUnique({ where: { username } });
    if (!user) return res.status(400).json({ error: "Invalid username or password" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid username or password" });


    // ✅ เพิ่ม role เข้าไปใน token
    const token = jwt.sign(
      { user_id: user.id, role: user.role }, // <<<<<<<<✅
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({ token, role: user.role, message: "Login successful!" }); // ✅ ส่ง role กลับไปด้วย
  } catch (error) {
    res.status(500).json({ error: "Something went wrong" });
  }
};
