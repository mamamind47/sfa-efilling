const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Storage config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const academicYearId = req.body.academic_year_id;
    const type = req.body.type;

    if (!academicYearId || !type) {
      return cb(new Error("Academic year and type are required"));
    }

    const uploadPath = path.join(
      __dirname,
      `../uploads/${type}/${academicYearId}`
    );

    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const userId = req.user?.id || "anonymous";
    const uniqueSuffix = Date.now() + path.extname(file.originalname);
    cb(null, `${userId}_${uniqueSuffix}`);
  },
});

// Filter
const fileFilter = (req, file, cb) => {
  if (
    !file.mimetype.startsWith("image/") &&
    file.mimetype !== "application/pdf"
  ) {
    return cb(new Error("Only images and PDFs are allowed"), false);
  }
  cb(null, true);
};

// Export middleware
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

module.exports = upload;
