const axios = require("axios");
const prisma = require("../config/database");
const jwt = require("jsonwebtoken");

const frontendRedirectUri = process.env.FRONTEND_CALLBACK_URL;
const tokenEndpoint = process.env.TOKEN_ENDPOINT;
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const jwtSecret = process.env.JWT_SECRET;
const studentApiUrl = process.env.STUDENT_API_URL;
const studentApiKey = process.env.STUDENT_API_KEY;

exports.callback = async (req, res) => {
  const { code } = req.body;

  if (
    !code ||
    !frontendRedirectUri ||
    !tokenEndpoint ||
    !clientId ||
    !clientSecret ||
    !jwtSecret
  ) {
    return res
      .status(500)
      .json({ error: "Missing environment variables or authorization code" });
  }

  try {
    const tokenResponse = await axios.post(
      tokenEndpoint,
      new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: frontendRedirectUri,
      }).toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        timeout: 15000,
      }
    );

    const {
      refresh_token: newRefreshToken,
      id_token: idToken,
      access_token,
    } = tokenResponse.data;
    const decodedIdToken = jwt.decode(idToken);
    if (!decodedIdToken) {
      throw new Error("Invalid ID Token received.");
    }

    const uniqueName = decodedIdToken.unique_name;
    const universityId = uniqueName?.includes("\\")
      ? uniqueName.split("\\")[1]
      : null;
    const usernameForDb = universityId;
    const emailFromUpn = decodedIdToken.upn;
    const name = decodedIdToken.name;

    if (!usernameForDb || !emailFromUpn) {
      return res
        .status(500)
        .json({ error: "Failed to determine user identity from ADFS." });
    }

    let user = await prisma.users.findUnique({
      where: { username: usernameForDb },
    });
    let message = "";
    let userRoleForToken = "";

    if (!user) {
      message = "User registered successfully";
      const initialRole = "student";
      userRoleForToken = initialRole;
      user = await prisma.users.create({
        data: {
          username: usernameForDb,
          name: name || usernameForDb,
          email: emailFromUpn,
          role: initialRole,
          refreshToken: newRefreshToken,
        },
      });
    } else {
      message = "User login successful";
      userRoleForToken = user.role;
      user = await prisma.users.update({
        where: { username: usernameForDb },
        data: { refreshToken: newRefreshToken },
      });
    }

    // อัปเดต name, faculty, major หากว่างและมีรหัสนักศึกษา
    if (
      (!user.name || !user.faculty || !user.major) &&
      /\d{11}/.test(usernameForDb)
    ) {
      try {
        const studentId = usernameForDb.match(/\d{11}/)?.[0];
        const studentInfo = await axios.get(`${studentApiUrl}/${studentId}`, {
          headers: { authKey: studentApiKey },
        });
        const data = studentInfo.data?.data;

        if (data) {
          await prisma.users.update({
            where: { username: usernameForDb },
            data: {
              name: `${data.firstnameTh} ${data.lastnameTh}`,
              faculty: data.facultyNameTh,
              major: data.fieldNameTh,
            },
          });
        }
      } catch (error) {
        console.error(
          "Failed to update user info from student API:",
          error.message
        );
      }
    }

    const backendPayload = {
      id: user.user_id,
      role: userRoleForToken,
      username: user.username,
    };
    const backendJwt = jwt.sign(backendPayload, jwtSecret, { expiresIn: "1h" });

    res.json({
      message,
      token: backendJwt,
      role: userRoleForToken,
    });
  } catch (error) {
    if (error.response) {
      res.status(error.response.status || 500).json({
        error:
          error.response.data?.error_description ||
          error.response.data?.error ||
          "ADFS request failed",
        details: error.response.data,
      });
    } else if (error.request) {
      res.status(504).json({ error: "No response received from ADFS server." });
    } else {
      res
        .status(500)
        .json({ error: "Internal server error.", details: error.message });
    }
  }
};
