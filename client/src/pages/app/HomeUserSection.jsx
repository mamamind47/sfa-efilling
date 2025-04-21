import React, { useEffect, useState } from "react";
import apiClient from "../../api/axiosConfig";
import { CheckCircle, XCircle, FilePlus2, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import bgImage from "../../assets/HomeSection.webp";

function UserHomeSection() {
  document.title = "หน้าหลัก | Volunteer Student Loan e-Filling";
  const [latestYear, setLatestYear] = useState("");
  const [volunteerHours, setVolunteerHours] = useState(0);
  const [scholarshipType, setScholarshipType] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const academicRes = await apiClient.get("/academic");
        const sorted = academicRes.data.sort((a, b) =>
          b.year_name.localeCompare(a.year_name)
        );
        const latest = sorted[0]?.year_name;
        setLatestYear(latest);

        const hoursRes = await apiClient.get("/user/hours");
        const targetYear = hoursRes.data.find((r) => r.year_name === latest);

        const totalHours =
          (targetYear?.volunteer_hours || 0) +
          (targetYear?.Certificate || 0) +
          (targetYear?.BloodDonate || 0) +
          (targetYear?.NSF || 0) +
          (targetYear?.["AOM YOUNG"] || 0);

        setVolunteerHours(totalHours);

        const scholarshipRes = await apiClient.get("/user/scholarship");
        const applied = scholarshipRes.data.find((s) => s.year_name === latest);
        setScholarshipType(applied?.type || null);
      } catch (error) {
        console.error("Error loading home data", error);
      }
    };
    fetchData();
  }, []);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative min-h-screen w-full bg-cover bg-center"
        style={{ backgroundImage: `url(${bgImage})` }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-50"></div>
        <div className="relative z-10 flex flex-col items-center text-white text-center py-10 px-4">
          <h1 className="text-2xl font-bold mb-6">
            สถานะของคุณในปีการศึกษา {latestYear}
          </h1>

          <div className="w-full max-w-xl space-y-4">
            <div className="bg-white text-black p-4 rounded-lg shadow">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold">จำนวนชั่วโมงจิตอาสา</p>
                  <p className="text-sm">{volunteerHours} / 36 ชั่วโมง</p>
                </div>
                {volunteerHours >= 36 ? (
                  <CheckCircle className="text-green-600" size={24} />
                ) : (
                  <XCircle className="text-red-500" size={24} />
                )}
              </div>
              <div className="w-full mt-2 h-4 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-green-500"
                  initial={{ width: 0 }}
                  animate={{
                    width: `${Math.min((volunteerHours / 36) * 100, 100)}%`,
                  }}
                  transition={{ duration: 1 }}
                ></motion.div>
              </div>
            </div>

            <div className="bg-white text-black p-4 rounded-lg shadow">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold">การสมัครทุน</p>
                  <p className="text-sm">
                    {scholarshipType
                      ? `สมัครแล้ว (${scholarshipType})`
                      : "ยังไม่ได้สมัครทุน"}
                  </p>
                </div>
                {scholarshipType ? (
                  <CheckCircle className="text-green-600" size={24} />
                ) : (
                  <XCircle className="text-red-500" size={24} />
                )}
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              className="bg-[#FF7D7D] hover:bg-[#ff5f5f] text-white px-6 py-4 rounded-2xl shadow-lg flex items-center gap-3 transform transition-transform duration-200"
              onClick={() => navigate("/app/submit/select")}
            >
              <FilePlus2 className="w-6 h-6" />
              <span className="text-lg font-bold">
                ยื่นเอกสารเพื่อรับชั่วโมง
              </span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              className="bg-white border border-base-300 px-4 py-2 rounded-xl shadow flex items-center gap-2 text-sm text-black"
              onClick={() => setShowPopup(true)}
            >
              <Info className="w-4 h-4 text-black" />
              <span className="font-medium">ทำไมสถานะถึงยังไม่อัปเดท</span>
            </motion.button>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {showPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl"
            >
              <h2 className="text-lg font-bold mb-2">ข้อมูลเพิ่มเติม</h2>
              <p className="text-sm text-gray-700 whitespace-pre-line">
                จำนวนชั่วโมงจาก MOD LINK
                และสถานะการสมัครทุนจะถูกอัปเดททุกสัปดาห์ หากคุณยังไม่ได้สมัครทุน
                โปรดสมัครในระบบสารสนเทศนักศึกษา (New ACIS)
                หากข้อมูลยังคงไม่อัปเดทนานกว่า 7 วัน โปรดติดต่อ
                กลุ่มงานช่วยเหลือทางการเงินแก่นักศึกษา โทร. 024709982
              </p>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setShowPopup(false)}
                  className="btn btn-sm bg-orange-500 text-white hover:bg-orange-600 flex items-center gap-1"
                >
                  <CheckCircle className="w-4 h-4" /> เข้าใจแล้ว
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default UserHomeSection;
