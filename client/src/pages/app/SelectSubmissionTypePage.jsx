import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../../api/axiosConfig";
import {
  HeartPulse,
  GraduationCap,
  Medal,
  Puzzle,
  ArrowRight,
  CheckCircle,
} from "lucide-react";
import dayjs from "dayjs";
import "dayjs/locale/th";
import buddhistEra from "dayjs/plugin/buddhistEra";

dayjs.extend(buddhistEra);
dayjs.locale("th");

function SelectSubmissionTypePage() {
  const [hoursData, setHoursData] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedYearId, setSelectedYearId] = useState(null);
  const [loading, setLoading] = useState(true);
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
          .filter(
            (y) => new Date(y.start_date) <= now && now <= new Date(y.end_date)
          )
          .sort((a, b) => new Date(b.start_date) - new Date(a.start_date));

        if (openYears.length > 0) {
          setSelectedYearId(openYears[0].academic_year_id);
        } else {
          alert("ไม่พบปีการศึกษาที่เปิดอยู่ในขณะนี้");
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
      label: "จากการบริจาคเลือด",
      icon: <HeartPulse size={20} className="text-orange-500" />,
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

  return (
    <div className="p-4 md:p-6">
      {/* Year Selector */}
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

      {/* Progress Summary */}
      {yearData && (
        <div className="mb-6 max-w-3xl">
          <div className="border border-orange-200 rounded-xl p-4 bg-orange-50">
            <p className="font-semibold text-base-content mb-2">
              จำนวนชั่วโมงจิตอาสาทั้งหมด
            </p>
            <div className="h-4 rounded-full overflow-hidden bg-base-300">
              <div
                className="h-full bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400"
                style={{
                  width: `${Math.min((total / 36) * 100, 100)}%`,
                }}
              ></div>
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

      {/* Summary by category */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {entries &&
          entries.map(([key, value]) => {
            const category = categoryMap[key] || {
              label: "อื่นๆ",
              icon: <Puzzle size={20} className="text-orange-500" />,
            };

            return (
              <div
                key={key}
                className="card bg-base-100 shadow-sm border border-base-200"
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
              </div>
            );
          })}
      </div>

      {/* Submission Category Selection */}
      <h2 className="text-xl font-semibold mb-3 text-base-content">
        เลือกรายการที่ต้องการยื่น
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <button
          className="card bg-base-100 shadow-md border border-base-200 hover:shadow-lg transition cursor-pointer"
          onClick={() => navigate(`/app/submit/${selectedYearId}/blood-donate`)}
        >
          <div className="card-body flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <HeartPulse size={40} className="text-red-500" />
              <div>
                <p className="text-base font-semibold text-base-content">
                  บริจาคเลือด
                </p>
                <p className="text-sm text-base-content">
                  สำหรับผู้ที่มีใบรับรองบริจาคเลือด
                </p>
              </div>
            </div>
            <ArrowRight className="shrink-0" />
          </div>
        </button>

        <button
          className="card bg-base-100 shadow-md border border-base-200 hover:shadow-lg transition cursor-pointer"
          onClick={() => navigate(`/app/submit/${selectedYearId}/certificate`)}
        >
          <div className="card-body flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <GraduationCap size={40} className="text-blue-500" />
              <div>
                <p className="text-base font-semibold text-base-content">
                  เรียนออนไลน์
                </p>
                <p className="text-sm text-base-content">
                  เช่น SET e-Learning
                </p>
              </div>
            </div>
            <ArrowRight className="shrink-0" />
          </div>
        </button>
      </div>
    </div>
  );
}

export default SelectSubmissionTypePage;