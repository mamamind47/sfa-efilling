// src/components/ProtectedLayout.jsx
import React from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import NavBar from "./Navbar";
import logo from "../assets/SL_e-Filling.png";
import { LogOut, ChevronDown } from "lucide-react";

import {
  Home,
  FileText,
  Calendar,
  ListChecks,
  ClipboardCheck,
  ClipboardEdit,
  SlidersHorizontal,
  Upload,
  FileUp,
  Hourglass,
  History,
  UserPen,
} from "lucide-react";

const DashboardPage = () => <div className="p-4">Dashboard Page</div>;
import ManageAcademicYearPage from "../pages/app/ManageAcademicYearPage.jsx";
import ManageCertificatesPage from "../pages/app/ManageCertificatesPage.jsx";
import UploadModLinkPage from "../pages/app/UploadModLinkPage.jsx";
import SelectSubmissionTypePage from "../pages/app/SelectSubmissionTypePage.jsx";
import PendingApprovalsPage from "../pages/app/PendingApprovalsPage.jsx";
import SubmitCertificatePage from "../pages/app/SubmitCertificatePage.jsx";
import SubmitBloodDonatePage from "../pages/app/SubmitBloodDonatePage.jsx";
import UploadScholarshipPage from "../pages/app/UploadScholarshipPage.jsx";
import UserHomeSection from "../pages/app/HomeUserSection.jsx";
import SubmitNSFPage from "../pages/app/SubmitNSFPage.jsx";
import SubmitAOMYoungPage from "../pages/app/SubmitAOMYoungPage.jsx";
import AdminUserStatsPage from "../pages/app/AdminUserStatsPage.jsx";
import UserSubmissionStatusPage from "../pages/app/UserSubmissionStatusPage.jsx";
import SubmitPlantPage from "../pages/app/SubmitPlantPage.jsx";
import ApprovalHistoryPage from "../pages/app/ApprovalHistoryPage.jsx";
import UserManagementPage from "../pages/app/UserManagementPage.jsx";
import SubmitReligiousMaintainPage from "../pages/app/SubmitReligiousMaintainPage.jsx";
import SubmitSocialDevelopmentPage from "../pages/app/SubmitSocialDevelopmentPage.jsx";

const CompletedCertificatesPage = () => (
  <div className="p-4">Completed Certificates Page</div>
);

const menuItemsData = (role) =>
  [
    {
      path: "/app/dashboard",
      icon: Home,
      text: "หน้าหลัก",
      roles: ["student", "admin"],
    },
    {
      path: "/app/submit/select",
      icon: FileText,
      text: "ยื่นใบรับรอง",
      roles: ["student"],
    },
    {
      path: "/app/submission-status",
      icon: Hourglass,
      text: "ตรวจสอบสถานะ",
      roles: ["student"],
    },
    {
      icon: SlidersHorizontal,
      text: "จัดการ",
      roles: ["admin"],
      subItems: [
        {
          path: "/app/manage-academic-year",
          icon: Calendar,
          text: "จัดการปีการศึกษา",
          roles: ["admin"],
        },
        {
          path: "/app/manage-users",
          icon: UserPen,
          text: "จัดการผู้ใช้",
          roles: ["admin"],
        },
        {
          path: "/app/manage-certificates",
          icon: ClipboardEdit,
          text: "จัดการหัวข้อ",
          roles: ["admin"],
        },
        {
          path: "/app/upload-modlink",
          icon: Upload,
          text: "อัปโหลดชั่วโมง (MOD LINK)",
          roles: ["admin"],
        },
        {
          path: "/app/upload-scholarship",
          icon: FileUp,
          text: "อัปโหลดรายชื่อสมัครทุน",
          roles: ["admin"],
        },
      ],
    },
    {
      path: "/app/pending-approvals",
      icon: ListChecks,
      text: "รอดำเนินการ",
      roles: ["admin"],
    },
    {
      path: "/app/history-approvals",
      icon: History,
      text: "ประวัติการอนุมัติ",
      roles: ["admin"],
    },
    {
      path: "/app/report",
      icon: ClipboardCheck,
      text: "สถิตินักศึกษา",
      roles: ["admin"],
    },
  ].filter((item) => item.roles.includes(role));

function ProtectedLayout() {
  const { role, logout } = useAuth();
  const location = useLocation();
  const currentMenuItems = menuItemsData(role || "");

  const isActive = (path) => {
    return (
      location.pathname === path || location.pathname.startsWith(path + "/")
    );
  };

  const isSubMenuActive = (subItems) => {
    return subItems && subItems.some((item) => isActive(item.path));
  };

  const getMobileLinkClass = (path) => {
    let baseClasses = "flex items-center space-x-3 text-base rounded-md";
    let stateClasses = isActive(path)
      ? "bg-base-200 font-semibold text-neutral-focus"
      : "hover:bg-base-200 text-neutral-focus";
    return `${baseClasses} ${stateClasses}`;
  };

  const getMobileSummaryClass = (subItems) => {
    let baseClasses = "flex items-center space-x-3 text-base rounded-md";
    let stateClasses = isSubMenuActive(subItems)
      ? "bg-base-200 font-semibold text-neutral-focus"
      : "hover:bg-base-200 text-neutral-focus";
    return `${baseClasses} ${stateClasses}`;
  };

  return (
    <div className="drawer">
      <input id="my-drawer" type="checkbox" className="drawer-toggle" />
      <div className="drawer-content flex flex-col min-h-screen">
        <NavBar />
        <div className="p-4 flex-grow">
          <Routes>
            {role === "student" && (
              <>
                <Route path="dashboard" element={<UserHomeSection />} />
                <Route
                  path="submit/select"
                  element={<SelectSubmissionTypePage />}
                />
                <Route
                  path="submit/:academic_year_id/select"
                  element={<SelectSubmissionTypePage />}
                />
                <Route
                  path="submit/:academic_year_id/certificate"
                  element={<SubmitCertificatePage />}
                />
                <Route
                  path="submit/:academic_year_id/blood-donate"
                  element={<SubmitBloodDonatePage />}
                />
                <Route
                  path="submit/:academic_year_id/nsf"
                  element={<SubmitNSFPage />}
                />
                <Route
                  path="submit/:academic_year_id/aom-young"
                  element={<SubmitAOMYoungPage />}
                />
                <Route
                  path="submit/:academic_year_id/plant"
                  element={<SubmitPlantPage />}
                />
                <Route
                  path="submit/:academic_year_id/religious"
                  element={<SubmitReligiousMaintainPage />}
                />
                <Route
                  path="submit/:academic_year_id/social-development"
                  element={<SubmitSocialDevelopmentPage />}
                />
                <Route
                  path="submission-status"
                  element={<UserSubmissionStatusPage />}
                />
              </>
            )}

            {role === "admin" && (
              <>
                <Route path="dashboard" element={<DashboardPage />} />
                <Route
                  path="manage-academic-year"
                  element={<ManageAcademicYearPage />}
                />
                <Route
                  path="manage-certificates"
                  element={<ManageCertificatesPage />}
                />
                <Route path="upload-modlink" element={<UploadModLinkPage />} />
                <Route
                  path="pending-approvals"
                  element={<PendingApprovalsPage />}
                />
                <Route path="report" element={<AdminUserStatsPage />} />
                <Route
                  path="upload-scholarship"
                  element={<UploadScholarshipPage />}
                />
                <Route
                  path="history-approvals"
                  element={<ApprovalHistoryPage />}
                />
                <Route path="manage-users" element={<UserManagementPage />} />
              </>
            )}

            <Route
              path="*"
              element={
                <div className="text-center text-red-500">
                  App Section Not Found
                </div>
              }
            />
          </Routes>
        </div>
      </div>
      <div className="drawer-side z-20">
        <label
          htmlFor="my-drawer"
          aria-label="close sidebar"
          className="drawer-overlay"
        ></label>
        <ul className="menu p-4 w-80 min-h-full bg-base-100 text-base-content flex flex-col">
          <li className="mb-4">
            <Link
              to={currentMenuItems[0]?.path || "/"}
              className="text-lg font-semibold p-0 hover:bg-transparent focus:bg-transparent active:bg-transparent"
            >
              <img src={logo} alt="Logo" className="h-8 w-auto" />
            </Link>
          </li>

          {currentMenuItems.map((item, index) =>
            item.subItems ? (
              <li key={item.text + index}>
                <details>
                  <summary className={getMobileSummaryClass(item.subItems)}>
                    {React.createElement(item.icon, { size: 16 })}
                    <span>{item.text}</span>
                  </summary>
                  <ul className="menu-dropdown p-2 bg-base-100 rounded-t-none">
                    {item.subItems.map((subItem) => (
                      <li key={subItem.path}>
                        <Link
                          to={subItem.path}
                          className={getMobileLinkClass(subItem.path)}
                        >
                          <span className="pl-4">{subItem.text}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </details>
              </li>
            ) : (
              <li key={item.path}>
                <Link to={item.path} className={getMobileLinkClass(item.path)}>
                  {React.createElement(item.icon, { size: 16 })}
                  <span>{item.text}</span>
                </Link>
              </li>
            )
          )}

          <li className="mt-auto">
            <button
              onClick={logout}
              className="text-error w-full justify-start hover:bg-base-200 rounded-md flex items-center space-x-3 text-base"
            >
              <LogOut size={16} /> <span>ออกจากระบบ</span>
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}

export default ProtectedLayout;
