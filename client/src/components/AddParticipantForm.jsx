import React, { useState } from "react";
import { Search, Loader2, Plus, X } from "lucide-react";
import { toast } from "react-hot-toast";
import apiClient from "../api/axiosConfig";

const AddParticipantForm = ({ projectId, onSuccess, onCancel }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [adding, setAdding] = useState(false);

  const handleSearchUsers = async () => {
    if (!searchQuery.trim()) {
      toast.error("กรุณาใส่รหัสนักศึกษา อีเมล หรือชื่อ-นามสกุล");
      return;
    }

    setSearching(true);
    try {
      const response = await apiClient.get("/projects/search-users", {
        params: { q: searchQuery.trim() }
      });

      if (response.data.length === 0) {
        toast.error("ไม่พบผู้ใช้ที่ค้นหา");
        setSearchResults([]);
      } else if (response.data.length === 1) {
        // Auto-add if only one result
        addUser(response.data[0]);
        setSearchResults([]);
      } else {
        setSearchResults(response.data);
      }
    } catch (error) {
      console.error("Error searching users:", error);
      toast.error(error.response?.data?.error || "เกิดข้อผิดพลาดในการค้นหา");
    } finally {
      setSearching(false);
    }
  };

  const addUser = (user) => {
    // Check if already added
    if (selectedUsers.some(u => u.user_id === user.user_id)) {
      toast.error("ผู้ใช้นี้ถูกเพิ่มไปแล้ว");
      return;
    }

    setSelectedUsers(prev => [...prev, user]);
    setSearchQuery("");
    setSearchResults([]);
    toast.success(`เพิ่ม ${user.name || user.username} แล้ว`);
  };

  const removeUser = (userId) => {
    setSelectedUsers(prev => prev.filter(u => u.user_id !== userId));
  };

  const handleAddParticipants = async () => {
    if (selectedUsers.length === 0) {
      toast.error("กรุณาเลือกผู้เข้าร่วมอย่างน้อย 1 คน");
      return;
    }

    setAdding(true);

    try {
      await apiClient.post(`/projects/${projectId}/participants`, {
        user_ids: selectedUsers.map(u => u.user_id)
      });

      toast.success(`เพิ่มผู้เข้าร่วม ${selectedUsers.length} คนสำเร็จ`);

      // Reset form
      setSelectedUsers([]);
      setSearchQuery("");
      setSearchResults([]);

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error adding participants:", error);
      toast.error(error.response?.data?.error || "เกิดข้อผิดพลาดในการเพิ่มผู้เข้าร่วม");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Users */}
      <div>
        <label className="block text-xs font-semibold mb-1.5 flex items-center gap-1.5">
          <Search className="h-3.5 w-3.5" />
          ค้นหาและเพิ่มผู้เข้าร่วม <span className="text-error">*</span>
        </label>
        <p className="text-[10px] text-gray-500 mb-1.5">
          ต้องพิมพ์ตรงกับข้อมูลจริงทุกตัวอักษร
        </p>

        <div className="join w-full">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="รหัสนักศึกษา, อีเมล หรือ ชื่อ-นามสกุล"
            className="input input-bordered input-sm join-item flex-1 text-sm"
            disabled={adding || searching}
            onKeyPress={(e) => e.key === "Enter" && handleSearchUsers()}
          />
          <button
            type="button"
            onClick={handleSearchUsers}
            className="btn btn-sm join-item bg-gradient-to-r from-orange-500 to-amber-500 text-white border-0 hover:from-orange-600 hover:to-amber-600"
            disabled={adding || searching}
          >
            {searching ? (
              <Loader2 className="animate-spin h-4 w-4" />
            ) : (
              <>
                <Search className="h-4 w-4 mr-1" />
                <span className="text-xs">ค้นหา</span>
              </>
            )}
          </button>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mt-2 border-2 border-orange-400 rounded-lg divide-y shadow-lg">
            <div className="bg-orange-100 px-2 py-1.5">
              <p className="text-xs font-semibold text-orange-700">
                พบ {searchResults.length} คน - คลิกเพื่อเพิ่ม
              </p>
            </div>
            <div className="max-h-60 overflow-y-auto">
              {searchResults.map(user => (
                <div
                  key={user.user_id}
                  className="p-2.5 hover:bg-orange-50 cursor-pointer flex justify-between items-center transition-colors border-b last:border-b-0"
                  onClick={() => addUser(user)}
                >
                  <div className="flex-1">
                    <p className="font-semibold text-xs text-gray-800">{user.name}</p>
                    <p className="text-[10px] text-gray-600 mt-0.5">
                      <span className="badge badge-outline badge-xs mr-1">{user.username}</span>
                      {user.email}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      {user.faculty} • {user.major}
                    </p>
                  </div>
                  <Plus className="h-5 w-5 text-orange-500 shrink-0 ml-2" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Selected Participants */}
      {selectedUsers.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-700">
              รายชื่อผู้เข้าร่วมที่เลือก
            </p>
            <span className="badge bg-orange-500 text-white badge-sm border-0">
              {selectedUsers.length} คน
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {selectedUsers.map((user) => (
              <div
                key={user.user_id}
                className="flex items-center justify-between bg-gradient-to-r from-orange-50 to-amber-50 p-2.5 rounded-lg border border-orange-200 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-2">
                  <div>
                    <p className="text-xs font-semibold text-gray-800">{user.name}</p>
                    <p className="text-[10px] text-gray-600">
                      <span className="badge badge-outline badge-xs">{user.username}</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeUser(user.user_id)}
                  className="btn btn-ghost btn-xs btn-circle hover:bg-error hover:text-white"
                  disabled={adding}
                  title="ลบ"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-sm btn-ghost"
            disabled={adding}
          >
            ยกเลิก
          </button>
        )}
        <button
          type="button"
          onClick={handleAddParticipants}
          className="btn btn-sm bg-gradient-to-r from-orange-500 to-amber-500 text-white border-0 hover:from-orange-600 hover:to-amber-600"
          disabled={adding || selectedUsers.length === 0}
        >
          {adding ? (
            <>
              <Loader2 className="animate-spin h-4 w-4 mr-1" />
              กำลังเพิ่ม...
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-1" />
              เพิ่มผู้เข้าร่วม ({selectedUsers.length} คน)
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default AddParticipantForm;
