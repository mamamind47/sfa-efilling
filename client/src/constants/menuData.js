// src/constants/menuData.js
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
  Mail,
  Bell,
  Newspaper,
  PenTool,
  FolderKanban,
  Plus,
  Folder,
  Users,
  CheckSquare,
} from "lucide-react";

export const menuItemsData = (role) =>
  [
    {
      path: "/app/dashboard",
      icon: Home,
      text: "หน้าหลัก",
      roles: ["student", "admin"],
    },
    {
      icon: FileText,
      text: "ยื่นเอกสาร",
      roles: ["student"],
      subItems: [
        {
          path: "/app/submit/select",
          icon: Upload,
          text: "ยื่นเอกสารรายบุคคล",
          roles: ["student"],
        },
        {
          path: "/app/submission-status",
          icon: Hourglass,
          text: "ตรวจสอบสถานะ",
          roles: ["student"],
        },
      ],
    },
    {
      icon: FolderKanban,
      text: "โครงการ",
      roles: ["student"],
      subItems: [
        {
          path: "/app/create-project",
          icon: Plus,
          text: "สร้างโครงการใหม่",
          roles: ["student"],
        },
        {
          path: "/app/my-projects",
          icon: Folder,
          text: "โครงการที่ฉันสร้าง",
          roles: ["student"],
        },
      ],
    },
    {
      icon: Users,
      text: "กิจกรรม",
      roles: ["student"],
      subItems: [
        {
          path: "/app/activities",
          icon: Calendar,
          text: "สมัครกิจกรรม",
          roles: ["student"],
        },
        {
          path: "/app/my-activities",
          icon: CheckSquare,
          text: "กิจกรรมที่ฉันเข้าร่วม",
          roles: ["student"],
        },
      ],
    },
    {
      path: "/app/posts",
      icon: Newspaper,
      text: "ข่าวสารและประกาศ",
      roles: ["student", "admin"],
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
        {
          path: "/app/manage-posts",
          icon: PenTool,
          text: "จัดการข่าวสารและประกาศ",
          roles: ["admin"],
        },
        {
          path: "/app/activity-limits",
          icon: SlidersHorizontal,
          text: "ตั้งค่าลิมิตชั่วโมงกิจกรรม",
          roles: ["admin"],
        },
        {
          path: "/app/history-approvals",
          icon: History,
          text: "ประวัติการอนุมัติ",
          roles: ["admin"],
        },
        {
          path: "/app/send-email",
          icon: Mail,
          text: "ส่งอีเมล",
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
      icon: FolderKanban,
      text: "โครงการกิจกรรม",
      roles: ["admin"],
      subItems: [
        {
          path: "/app/manage-projects",
          icon: ListChecks,
          text: "จัดการโครงการ",
          roles: ["admin"],
        },
        {
          path: "/app/my-projects",
          icon: Folder,
          text: "โครงการของฉัน",
          roles: ["admin"],
        },
        {
          path: "/app/create-project",
          icon: Plus,
          text: "สร้างโครงการ",
          roles: ["admin"],
        },
      ],
    },
    {
      path: "/app/report",
      icon: ClipboardCheck,
      text: "สถิตินักศึกษา",
      roles: ["admin"],
    },
  ].filter((item) => item.roles.includes(role));

// Helper functions for navigation state
export const createNavigationHelpers = (location) => {
  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  const isSubMenuActive = (subItems) => {
    return subItems && subItems.some((item) => isActive(item.path));
  };

  return { isActive, isSubMenuActive };
};