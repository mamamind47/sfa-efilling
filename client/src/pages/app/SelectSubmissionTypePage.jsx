import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import apiClient from "../../api/axiosConfig";
import {
  HeartPulse,
  GraduationCap,
  Medal,
  Puzzle,
  ArrowRight,
  CheckCircle,
  PiggyBank,
  LineChart,
  TreePine,
  Church,
  School,
} from "lucide-react";
import dayjs from "dayjs";
import "dayjs/locale/th";
import buddhistEra from "dayjs/plugin/buddhistEra";

dayjs.extend(buddhistEra);
dayjs.locale("th");

function SelectSubmissionTypePage() {
  document.title = "ยื่นเอกสาร | Volunteer Student Loan e-Filling";
  const [hoursData, setHoursData] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedYearId, setSelectedYearId] = useState(null);
  const [, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [hoursRes, academicRes] = await Promise.all([
          apiClient.get("/user/hours"),
          apiClient.get("/academic"),
        ]);

        const now = new Date();
        const openYears = academicRes.data
          .filter((y) => {
            if (y.status === "OPEN") return true;
            if (y.status === null) {
              const start = new Date(y.start_date);
              const end = new Date(y.end_date);
              return start <= now && now <= end;
            }
            return false;
          })
          .sort((a, b) => new Date(b.start_date) - new Date(a.start_date));        

        if (openYears.length > 0) {
          setSelectedYearId(openYears[0].academic_year_id);
        } else {
          alert("ขออภัย ไม่อยู่ในช่วงให้ยื่นเอกสาร");
        }

        setAcademicYears(openYears);
        setHoursData(hoursRes.data);
      } catch (err) {
        console.error("โหลดข้อมูลล้มเหลว", err);
        setError("ไม่สามารถโหลดข้อมูลได้");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatDate = (date) => dayjs(date).format("D MMMM BBBB");

  const categoryMap = {
    volunteer_hours: {
      label: "ชั่วโมงจิตอาสาจาก MOD LINK",
      icon: <Medal size={20} className="text-orange-500" />,
    },
    Certificate: {
      label: "ชั่วโมงจากการเรียน e-Learning",
      icon: <GraduationCap size={20} className="text-orange-500" />,
    },
    BloodDonate: {
      label: "ชั่วโมงจากการบริจาคเลือด",
      icon: <HeartPulse size={20} className="text-orange-500" />,
    },
    NSF: {
      label: "ชั่วโมงจากการออมเงิน กอช.",
      icon: <PiggyBank size={20} className="text-orange-500" />,
    },
    "AOM YOUNG": {
      label: "ชั่วโมงจากการลงทุน AOM YOUNG",
      icon: <LineChart size={20} className="text-orange-500" />,
    },
    religious: {
      label: "ชั่วโมงจากกิจกรรมทำนุบำรุงศาสนสถาน",
      icon: <Church size={20} className="text-orange-500" />,
    },
    "social-development": {
      label: "ชั่วโมงจากกิจกรรมพัฒนาโรงเรียน ชุมชนและสังคม",
      icon: <School size={20} className="text-orange-500" />,
    },
    "ต้นไม้ล้านต้น ล้านความดี": {
      label: "ชั่วโมงจากต้นไม้ล้านต้น ล้านความดี",
      icon: <TreePine size={20} className="text-orange-500" />,
    },
  };

  const yearData = hoursData.find(
    (entry) => entry.academic_year_id === selectedYearId
  );

  const total = yearData
    ? Object.entries(yearData).reduce((acc, [key, val]) => {
        if (["academic_year_id", "year_name"].includes(key)) return acc;
        return acc + (val || 0);
      }, 0)
    : 0;

  const entries = yearData
    ? Object.entries(yearData).filter(
        ([key]) => !["academic_year_id", "year_name"].includes(key)
      )
    : [];

  const isCompleted = total >= 36;

  if (!selectedYearId) {
    return (
      <div className="p-4 text-center text-red-600 font-semibold text-lg">
        ขออภัย ขณะนี้ไม่อยู่ในช่วงให้ยื่นเอกสาร หากท่านไม่ได้ยื่นเอกสารภายในระยะเวลาที่กำหนด โปรดติดต่อเจ้าหน้าที่ ที่เบอร์ 02-470-9982
      </div>
    );
  }

  return (
    <motion.div
      className="p-4 md:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {academicYears.length > 0 && (
        <div className="mb-4 max-w-2xl">
          <label className="block mb-1 font-medium text-base-content">
            ปีการศึกษา:
          </label>
          <select
            className="select select-bordered w-full"
            value={selectedYearId || ""}
            onChange={(e) => setSelectedYearId(e.target.value)}
          >
            {academicYears.map((year) => (
              <option key={year.academic_year_id} value={year.academic_year_id}>
                {`ปีการศึกษา ${year.year_name} (เปิด: ${formatDate(
                  year.start_date
                )} - ปิด: ${formatDate(year.end_date)})`}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && <div className="alert alert-error mb-4">{error}</div>}

      {yearData && (
        <div className="mb-6 max-w-3xl">
          <div className="border border-orange-200 rounded-xl p-4 bg-orange-50">
            <p className="font-semibold text-base-content mb-2">
              จำนวนชั่วโมงจิตอาสาทั้งหมด
            </p>
            <div className="h-4 rounded-full overflow-hidden bg-base-300">
              <motion.div
                className="h-full bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((total / 36) * 100, 100)}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
            <p
              className={`text-xl font-bold text-right mt-1 flex items-center justify-end gap-2 ${
                isCompleted ? "text-green-600" : "text-orange-600"
              }`}
            >
              {isCompleted && (
                <CheckCircle size={20} className="text-green-600" />
              )}{" "}
              {total} / 36 ชั่วโมง
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {entries &&
          entries.map(([key, value]) => {
            const category = categoryMap[key] || {
              label: "อื่นๆ",
              icon: <Puzzle size={20} className="text-orange-500" />,
            };

            return (
              <motion.div
                key={key}
                className="card bg-base-100 shadow-sm border border-base-200"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="card-body">
                  <h2 className="card-title text-base-content text-md">
                    {category.icon}
                    <span>{category.label}</span>
                  </h2>
                  <p className="text-2xl font-semibold text-base-content">
                    {value} ชั่วโมง
                  </p>
                </div>
              </motion.div>
            );
          })}
      </div>

      <h2 className="text-xl font-semibold mb-3 text-base-content">
        เลือกรายการที่ต้องการยื่น
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <motion.button
          className="card bg-base-100 shadow-md border border-base-200 hover:shadow-lg transition cursor-pointer"
          whileHover={{ scale: 1.03 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          onClick={() => navigate(`/app/submit/${selectedYearId}/blood-donate`)}
        >
          <div className="card-body flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <HeartPulse size={40} className="text-red-500" />
              <div>
                <p className="text-base font-semibold text-base-content">
                  บริจาคโลหิต
                </p>
                <p className="text-sm text-base-content">
                  สำหรับผู้ที่มีใบรับรองบริจาคเลือด
                </p>
              </div>
            </div>
            <ArrowRight className="shrink-0" />
          </div>
        </motion.button>

        <motion.button
          className="card bg-base-100 shadow-md border border-base-200 hover:shadow-lg transition cursor-pointer"
          whileHover={{ scale: 1.03 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          onClick={() => navigate(`/app/submit/${selectedYearId}/certificate`)}
        >
          <div className="card-body flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <GraduationCap size={40} className="text-blue-500" />
              <div>
                <p className="text-base font-semibold text-base-content">
                  e-Learning
                </p>
                <p className="text-sm text-base-content">เช่น SET e-Learning</p>
              </div>
            </div>
            <ArrowRight className="shrink-0" />
          </div>
        </motion.button>

        <motion.button
          className="card bg-base-100 shadow-md border border-base-200 hover:shadow-lg transition cursor-pointer"
          whileHover={{ scale: 1.03 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          onClick={() => navigate(`/app/submit/${selectedYearId}/nsf`)}
        >
          <div className="card-body flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <PiggyBank size={40} className="text-rose-500" />
              <div>
                <p className="text-base font-semibold text-base-content">
                  ออมเงิน กอช.
                </p>
                <p className="text-sm text-base-content">
                  แนบ Statement และเกียรติบัตร (ถ้ามี)
                </p>
              </div>
            </div>
            <ArrowRight className="shrink-0" />
          </div>
        </motion.button>

        <motion.button
          className="card bg-base-100 shadow-md border border-base-200 hover:shadow-lg transition cursor-pointer"
          whileHover={{ scale: 1.03 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          onClick={() => navigate(`/app/submit/${selectedYearId}/aom-young`)}
        >
          <div className="card-body flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <LineChart size={40} className="text-green-600" />
              <div>
                <p className="text-base font-semibold text-base-content">
                  โครงการ AOM YOUNG
                </p>
                <p className="text-sm text-base-content">
                  แนบสลิปการลงทุน และ รายการเดินบัญชีกองทุน (Statement)
                </p>
              </div>
            </div>
            <ArrowRight className="shrink-0" />
          </div>
        </motion.button>

        <motion.button
          className="card bg-base-100 shadow-md border border-base-200 hover:shadow-lg transition cursor-pointer"
          whileHover={{ scale: 1.03 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          onClick={() => navigate(`/app/submit/${selectedYearId}/plant`)}
        >
          <div className="card-body flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <TreePine size={40} className="text-green-600" />
              <div>
                <p className="text-base font-semibold text-base-content">
                  ต้นไม้ล้านต้น ล้านความดี
                </p>
                <p className="text-sm text-base-content">
                  แนบรูปภาพขณะปลูกต้นไม้ และเกียรติบัตร
                </p>
              </div>
            </div>
            <ArrowRight className="shrink-0" />
          </div>
        </motion.button>

        <motion.button
          className="card bg-base-100 shadow-md border border-base-200 hover:shadow-lg transition cursor-pointer"
          whileHover={{ scale: 1.03 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          onClick={() => navigate(`/app/submit/${selectedYearId}/religious`)}
        >
          <div className="card-body flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Church size={40} className="text-yellow-600" />
              <div>
                <p className="text-base font-semibold text-base-content">
                  กิจกรรมทำนุบำรุงศาสนสถาน
                </p>
                <p className="text-sm text-base-content">
                  แนบรูปภาพขณะทำกิจกรรม พร้อมเอกสารแบบฟอร์มจิตอาสา
                </p>
              </div>
            </div>
            <ArrowRight className="shrink-0" />
          </div>
        </motion.button>

        <motion.button
          className="card bg-base-100 shadow-md border border-base-200 hover:shadow-lg transition cursor-pointer"
          whileHover={{ scale: 1.03 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          onClick={() => navigate(`/app/submit/${selectedYearId}/social-development`)}
        >
          <div className="card-body flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <School size={40} className="text-blue-600" />
              <div>
                <p className="text-base font-semibold text-base-content">
                  กิจกรรมพัฒนาโรงเรียน ชุมชนและสังคม
                </p>
                <p className="text-sm text-base-content">
                  เฉพาะกิจกรรมที่ไม่ใช่เป็นกิจกรรมมหาวิทยาลัยเท่านั้น
                </p>
                <p className="text-sm text-base-content">
                  หากเป็นกิจกรรมมหาวิทยาลัย โปรดติดต่อผู้จัดงาน
                </p>
              </div>
            </div>
            <ArrowRight className="shrink-0" />
          </div>
        </motion.button>
      </div>
    </motion.div>
  );
}

export default SelectSubmissionTypePage;