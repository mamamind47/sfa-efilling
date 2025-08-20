import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { UserPlus, UploadCloud, ShieldCheck } from "lucide-react";
import AddUserModal from "../../components/AddUserModal";
import ImportUserExcelModal from "../../components/ImportUserExcelModal";
import apiClient from "../../api/axiosConfig";

function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [loading, setLoading] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);

  const [selectedUser, setSelectedUser] = useState(null);
  const [newRole, setNewRole] = useState("");

  const limit = 10;

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/admin/users", {
        params: {
          page,
          limit,
          search,
          role: roleFilter,
        },
      });
      setUsers(res.data.users);
      setTotal(res.data.total);
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line
  }, [page, search, roleFilter]);

  // Reset page to 1 when search or roleFilter changes
  useEffect(() => {
    setPage(1);
  }, [search, roleFilter]);

  const handleRoleChange = async (username, newRole) => {
    try {
      await apiClient.put(`/admin/users/${username}/role`, { role: newRole });
      fetchUsers();
      setEditingUserId(null);
    } catch (err) {
      console.error("Error updating role:", err);
    }
  };


  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <UserPlus className="text-orange-500" size={24} />
          จัดการผู้ใช้
        </h1>
        <div className="flex gap-2">
          <button onClick={() => setShowAddModal(true)} className="btn btn-sm bg-orange-500 hover:bg-orange-600 text-white border-orange-500">
            <UserPlus size={16} />
            เพิ่มผู้ใช้ใหม่
          </button>
          <button onClick={() => setShowImportModal(true)} className="btn btn-sm bg-white text-black border-orange-500 hover:bg-orange-50">
            <UploadCloud size={16} />
            นำเข้ารายชื่อจาก Excel
          </button>
        </div>
      </div>

      {/* 🔍 Filters and Search */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
        <input
          type="text"
          className="input input-bordered input-sm w-full md:w-60"
          placeholder="ค้นหาชื่อ / รหัสนักศึกษา / ชื่อผู้ใช้ / อีเมล"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="select select-sm select-bordered w-full md:w-40"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="">ทั้งหมด</option>
          <option value="student">เฉพาะนักศึกษา</option>
          <option value="admin">เฉพาะผู้ดูแลระบบ</option>
        </select>
      </div>

      {/* 📋 Table */}
      <div className="rounded-xl border border-base-300 bg-base-100 shadow-sm p-4">
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead className="bg-base-200 text-base-content">
              <tr>
                <th>ชื่อ</th>
                <th>รหัสนักศึกษา/ชื่อผู้ใช้</th>
                <th>อีเมล</th>
                <th>เบอร์โทร</th>
                <th>สิทธิ์การใช้งาน</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center text-gray-500 py-4">
                    Loading...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-gray-400 py-4">
                    ไม่พบข้อมูลผู้ใช้
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.user_id}>
                    <td>{user.name}</td>
                    <td>{user.username}</td>
                    <td>{user.email}</td>
                    <td>{user.phone || "-"}</td>
                    <td>
                      <span>{user.role === "student" ? "นักศึกษา" : "ผู้ดูแลระบบ"}</span>
                    </td>
                    <td>
                      <button
                        className="btn btn-xs bg-indigo-500 hover:bg-indigo-600 text-white border-indigo-500"
                        onClick={() => {
                          setSelectedUser(user);
                          setNewRole(user.role);
                        }}
                      >
                        <ShieldCheck size={14} className="mr-1" />
                        แก้ไขสิทธิ์
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Custom Pagination */}
        <div className="flex items-center justify-between mt-6 text-sm text-gray-600">
          <div>
            หน้า {page} / {Math.ceil(total / limit)} (พบ {total.toLocaleString()} รายการ)
          </div>
          <div className="join">
            <button
              className="join-item btn btn-sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              ก่อนหน้า
            </button>
            <button
              className="join-item btn btn-sm"
              onClick={() => setPage((p) => Math.min(Math.ceil(total / limit), p + 1))}
              disabled={page === Math.ceil(total / limit)}
            >
              ถัดไป
            </button>
          </div>
        </div>
      </div>

      {/* 🧩 Modals */}
      <AddUserModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={fetchUsers}
      />
      <ImportUserExcelModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={fetchUsers}
      />

      {selectedUser && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">แก้ไขสิทธิ์ผู้ใช้</h2>
              <button onClick={() => setSelectedUser(null)} className="btn btn-sm btn-ghost">✕</button>
            </div>
            <div>
              <p className="text-sm">ชื่อ: <strong>{selectedUser.name}</strong></p>
              <p className="text-sm">รหัสนักศึกษา/ชื่อผู้ใช้: <strong>{selectedUser.username}</strong></p>
            </div>
            <div className="form-control">
              <label className="label text-sm">สิทธิ์การใช้งานใหม่</label>
              <select
                className="select select-bordered w-full"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
              >
                <option value="student">นักศึกษา</option>
                <option value="admin">ผู้ดูแลระบบ</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setSelectedUser(null)} className="btn btn-sm btn-ghost">ยกเลิก</button>
              <button
                onClick={async () => {
                  try {
                    await apiClient.post("/admin/users/update-role", {
                      username: selectedUser.username,
                      role: newRole,
                    });
                    toast.success("อัปเดตสิทธิ์ผู้ใช้เรียบร้อยแล้ว");
                    setSelectedUser(null);
                    fetchUsers();
                  } catch (err) {
                    console.error("Error updating role:", err);
                  }
                }}
                className="btn btn-sm bg-orange-500 hover:bg-orange-600 text-white border-orange-500"
              >
                ยืนยันการเปลี่ยนสิทธิ์
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserManagementPage;
