const axios = require("axios");
const prisma = require("../config/database"); // ตรวจสอบ path ให้ถูกต้อง
const jwt = require("jsonwebtoken"); // ตรวจสอบว่า import แล้ว

// ดึงค่าจาก Environment Variables
const frontendRedirectUri = process.env.FRONTEND_CALLBACK_URL;
const tokenEndpoint = process.env.TOKEN_ENDPOINT;
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const jwtSecret = process.env.JWT_SECRET; // Secret Key สำหรับสร้าง JWT ของ Backend

// Function หลักสำหรับ Callback
exports.callback = async (req, res) => {
  const { code } = req.body;

  // --- ตรวจสอบค่าที่จำเป็น ---
  if (!code) {
    return res.status(400).json({ error: "Authorization code is missing" });
  }
  if (!frontendRedirectUri) {
    /* ... Error handling ... */ return res.status(500).json({ error: "..." });
  }
  if (!tokenEndpoint || !clientId || !clientSecret || !jwtSecret) {
    /* ... Error handling ... */ return res.status(500).json({ error: "..." });
  }
  // --- ---------------- ---

  try {
    // --- Step 1: แลก Authorization Code เป็น Tokens จาก ADFS ---
    console.log(`Requesting token from ${tokenEndpoint}`);
    const tokenResponse = await axios.post(
      tokenEndpoint,
      new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: frontendRedirectUri,
        // scope: 'openid profile email unique_name' // อาจจะต้องใส่ scope
      }).toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        timeout: 15000,
      }
    );

    if (
      !tokenResponse.data ||
      !tokenResponse.data.access_token ||
      !tokenResponse.data.id_token
    ) {
      console.error("Invalid token response from ADFS:", tokenResponse.data);
      throw new Error("Failed to obtain tokens from ADFS.");
    }

    const { refresh_token: newRefreshToken, id_token: idToken } =
      tokenResponse.data;
    const adfsAccessToken = tokenResponse.data.access_token; // เก็บไว้เผื่อใช้สร้าง JWT เฉยๆ
    console.log("Received tokens from ADFS.");

    // --- Step 2: ถอดรหัส ID Token ดึงข้อมูล User ---
    const decodedIdToken = jwt.decode(idToken);
    if (!decodedIdToken) {
      throw new Error("Invalid ID Token received.");
    }
    console.log("Decoded ID Token Payload:", decodedIdToken);

    // ดึงข้อมูล: รหัสนักศึกษาเป็น username, UPN เป็น email
    const uniqueName = decodedIdToken.unique_name;
    const universityId = uniqueName?.includes("\\")
      ? uniqueName.split("\\")[1]
      : null;
    const usernameForDb = universityId;
    const emailFromUpn = decodedIdToken.upn;
    const name = decodedIdToken.name; // ชื่อ (ถ้ามี)

    if (!usernameForDb || !emailFromUpn) {
      console.error(
        "Missing required claims (unique_name/upn) from ID Token:",
        decodedIdToken
      );
      return res
        .status(500)
        .json({ error: "Failed to determine user identity from ADFS." });
    }
    console.log(`Processing login for User ID: ${usernameForDb}`);

    // --- Step 3, 4, 5: ค้นหา, สร้าง หรือ อัปเดตผู้ใช้ ---
    let user = await prisma.users.findUnique({
      where: { username: usernameForDb },
    });
    let message = "";
    let userRoleForToken = ""; // Role ที่จะใช้สร้าง JWT

    if (!user) {
      // สร้าง User ใหม่ กำหนด Role เป็น 'student'
      message = "User registered successfully";
      const initialRole = "student";
      userRoleForToken = initialRole;
      console.log(
        `Creating new user: ${usernameForDb} with role ${initialRole}`
      );
      user = await prisma.users.create({
        data: {
          username: usernameForDb,
          name: name || usernameForDb,
          email: emailFromUpn,
          role: initialRole, // Role เริ่มต้น
          refreshToken: newRefreshToken,
        },
      });
    } else {
      // User มีอยู่แล้ว - อัปเดตเฉพาะ Refresh Token
      message = "User login successful";
      userRoleForToken = user.role; // ใช้ Role เดิมจาก DB
      console.log(`Updating refresh token for existing user: ${usernameForDb}`);
      user = await prisma.users.update({
        where: { username: usernameForDb },
        data: {
          refreshToken: newRefreshToken, // <-- อัปเดตแค่อันนี้
          // ไม่ต้องอัปเดต role, name, email แล้ว
        },
      });
    }

    // --- Step 6: สร้าง JWT ของ Backend เอง ---
    console.log(
      `Generating backend JWT for user ID: ${user.user_id}, role: ${userRoleForToken}`
    );
    const backendPayload = {
      id: user.user_id,
      role: userRoleForToken, // ใช้ Role จาก DB
      username: user.username,
    };
    const backendJwt = jwt.sign(backendPayload, jwtSecret, { expiresIn: "1h" });
    // --- -------------------------------- ---

    // --- Step 7: ส่ง JWT ของ Backend กลับไป ---
    console.log(
      `Sending response for user: ${user.username}, role: ${userRoleForToken}`
    );
    res.json({
      message: message,
      token: backendJwt, // <-- JWT ที่ Backend สร้าง
      role: userRoleForToken, // <-- Role จาก DB
    });
    // --- ------------------------------- ---
  } catch (error) {
    // --- Error Handling (เหมือนเดิม) ---
    console.error("--- ADFS Callback Error ---");
    if (error.response) {
      console.error("Error Data:", error.response.data);
      res
        .status(error.response.status || 500)
        .json({
          error:
            error.response.data?.error_description ||
            error.response.data?.error ||
            "ADFS request failed",
          details: error.response.data,
        });
    } else if (error.request) {
      console.error("Error Request:", error.request);
      res.status(504).json({ error: "No response received from ADFS server." });
    } else {
      console.error("Error Message:", error.message);
      res
        .status(500)
        .json({
          error: "Internal server error during callback processing.",
          details: error.message,
        });
    }
    console.error("--- End ADFS Callback Error ---");
    // --- --------------------------- ---
  }
};