// src/pages/admin/AdminUserStatsPage.jsx
import React, { useEffect, useState } from "react";
import apiClient from "../../api/axiosConfig";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";

function AdminUserStatsPage() {
  const [users, setUsers] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [faculty, setFaculty] = useState("");
  const [status, setStatus] = useState("");
  const [scholarship, setScholarship] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      const res = await apiClient.get("/admin/users", {
        params: { page, search, faculty, status, scholarship },
      });
      setUsers(res.data.users);
      setTotalPages(res.data.totalPages);
    };

    const fetchFaculties = async () => {
      const res = await apiClient.get("/admin/faculties");
      setFaculties(res.data);
    };

    fetchUsers();
    fetchFaculties();
  }, [page, search, faculty, status, scholarship]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">รายการนักศึกษาทั้งหมด</h1>

      <div className="flex gap-4 flex-wrap items-center">
        <input
          type="text"
          placeholder="ค้นหาชื่อ รหัส สาขา..."
          className="input input-bordered"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="select select-bordered"
          value={faculty}
          onChange={(e) => setFaculty(e.target.value)}
        >
          <option value="">ทุกคณะ</option>
          {faculties.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>

        <select
          className="select select-bordered"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">ทุกสถานะชั่วโมง</option>
          <option value="complete">ครบ 36 ชั่วโมง</option>
          <option value="incomplete">ไม่ครบ</option>
        </select>

        <select
          className="select select-bordered"
          value={scholarship}
          onChange={(e) => setScholarship(e.target.value)}
        >
          <option value="">ทุกสถานะทุน</option>
          <option value="yes">สมัครแล้ว</option>
          <option value="no">ยังไม่สมัคร</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="table table-zebra w-full">
          <thead>
            <tr>
              <th>ชื่อ</th>
              <th>รหัส</th>
              <th>คณะ</th>
              <th>สาขา</th>
              <th>MODLINK</th>
              <th>e-Learning</th>
              <th>บริจาคเลือด</th>
              <th>อื่นๆ</th>
              <th>ทุน</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.user_id}>
                <td>{u.name}</td>
                <td>{u.username}</td>
                <td>{u.faculty}</td>
                <td>{u.major}</td>
                <td>{u.volunteer_hours}</td>
                <td>{u.Certificate}</td>
                <td>{u.BloodDonate}</td>
                <td>{u.others}</td>
                <td>
                  {u.scholarship_type ? (
                    <span className="text-green-600">{u.scholarship_type}</span>
                  ) : (
                    <span className="text-gray-400">ยังไม่สมัคร</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-center gap-3 my-4">
        <button
          className="btn btn-sm"
          disabled={page === 1}
          onClick={() => setPage((p) => p - 1)}
        >
          <ChevronLeft size={16} /> ก่อนหน้า
        </button>
        <span className="mt-2">
          หน้า {page} / {totalPages}
        </span>
        <button
          className="btn btn-sm"
          disabled={page === totalPages}
          onClick={() => setPage((p) => p + 1)}
        >
          ถัดไป <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

export default AdminUserStatsPage;
