const prisma = require("../config/database");

exports.getActiveStudents = async (req, res) => {
  try {
    const { studentIds } = req.body;

    if (!Array.isArray(studentIds)) {
      return res
        .status(400)
        .json({ error: "Invalid input. studentIds must be an array." });
    }

    const activeStatuses = await Promise.all(
      studentIds.map(async (user_id) => {
        const student = await prisma.users.findUnique({
          where: { user_id },
        });
        return { user_id, isActive: !!student };
      })
    );
    res.status(200).json(activeStatuses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};
