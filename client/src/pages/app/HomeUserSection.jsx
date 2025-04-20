import React, { useEffect, useState } from "react";
import apiClient from "../../api/axiosConfig";
import { CheckCircle, XCircle } from "lucide-react";
import bgImage from "../../assets/HomeSection.png";

function UserHomeSection() {
  const [latestYear, setLatestYear] = useState("");
  const [volunteerHours, setVolunteerHours] = useState(0);
  const [scholarshipType, setScholarshipType] = useState(null);

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
        setVolunteerHours(targetYear?.volunteer_hours || 0);

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
    <div
      className="relative w-full h-[300px] bg-cover bg-center"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      <div className="absolute inset-0 bg-black bg-opacity-60 flex flex-col justify-center items-center text-white text-center p-4">
        <h1 className="text-2xl font-bold mb-4">
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
            <progress
              className="progress progress-success w-full mt-2"
              value={Math.min(volunteerHours, 36)}
              max="36"
            ></progress>
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
      </div>
    </div>
  );
}

export default UserHomeSection;