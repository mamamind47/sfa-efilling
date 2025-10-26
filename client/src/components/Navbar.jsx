// src/components/NavBar.jsx
import React from "react";
import { useLocation, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { LogOut, Menu as MenuIcon, ChevronDown } from "lucide-react";
import logo from "../assets/KMUTT.png";
import NotificationBell from "./NotificationBell";
import { menuItemsData, createNavigationHelpers } from "../constants/menuData.js";

// --- Helper Components & Functions ---
const NavLink = ({ path, icon, text }) => {
  const location = useLocation();
  const isActive = (p) =>
    location.pathname === p || location.pathname.startsWith(p + "/");
  const isSubMenuActive = (subItems) =>
    subItems && subItems.some((item) => isActive(item.path)); // isSubMenuActive อาจจะไม่จำเป็นใน NavLink โดยตรง

  const getLinkClass = (p) => {
    let baseClasses =
      "p-2 rounded-md flex items-center space-x-2 text-base text-neutral-focus group";
    let activeClass = isActive(p)
      ? "bg-base-200 font-semibold"
      : "hover:bg-base-200";
    // ถ้าเป็น Link ใน Dropdown อาจจะไม่ต้องมี active background ที่นี่
    // ลองปรับแก้ activeClass สำหรับ subitem links
    // activeClass = isActive(p) ? "font-semibold text-primary" : "hover:bg-base-200"; // ตัวอย่าง
    return `${baseClasses} ${activeClass}`;
  };

  return (
    <Link to={path} className={getLinkClass(path)}>
      {React.cloneElement(icon, {
        size: 16,
        className:
          "transition-transform duration-150 ease-in-out group-hover:rotate-12",
      })}
      <span className="hidden md:inline">{text}</span>
    </Link>
  );
};
// --- --------------------------- ---

const NavBar = () => {
  const location = useLocation();
  const { role, logout } = useAuth();
  const currentMenuItems = menuItemsData(role || "");
  const { isActive, isSubMenuActive } = createNavigationHelpers(location);
  // Function สร้าง Class สำหรับ Dropdown Trigger (Parent Menu)
  const getLinkClassForDropdown = (subItems) => {
    let baseClasses =
      "p-2 rounded-md flex items-center space-x-2 text-base text-neutral-focus group"; // ใช้เหมือน NavLink แต่ไม่ผูกกับ path เดี่ยว
    let active = isSubMenuActive(subItems);
    let activeClass = active
      ? "bg-base-200 font-semibold"
      : "hover:bg-base-200";
    return `${baseClasses} ${activeClass}`;
  };

  return (
    <div className="navbar bg-base-100 shadow-md px-4 md:px-6">
      {/* navbar-start: Logo & Hamburger */}
      <div className="navbar-start">
        <label
          htmlFor="my-drawer"
          className="btn btn-ghost btn-circle drawer-button md:hidden mr-2"
        >
          {" "}
          <MenuIcon size={20} />{" "}
        </label>
        <Link to={currentMenuItems[0]?.path || "/"}>
          {" "}
          <img src={logo} alt="Logo" className="h-10 md:h-10 w-auto" />{" "}
        </Link>
      </div>

      {/* navbar-center: Desktop Menu */}
      <div className="navbar-center hidden md:flex">
        <div className="flex items-center space-x-4">
          {" "}
          {/* <-- เพิ่มระยะห่างเป็น space-x-4 */}
          {currentMenuItems.map((item, index) =>
            item.subItems ? (
              // --- Render Dropdown ---
              <div
                key={item.text + index}
                className="dropdown dropdown-hover dropdown-bottom"
              >
                <div
                  tabIndex={0}
                  role="button"
                  className={getLinkClassForDropdown(item.subItems)}
                >
                  {React.createElement(item.icon, { size: 16 })}
                  <span className="hidden md:inline">{item.text}</span>
                  <ChevronDown
                    size={16}
                    className="hidden md:inline ml-1 opacity-75"
                  />
                </div>
                {/* Dropdown Content */}
                <ul
                  tabIndex={0}
                  className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-60"
                >
                  {" "}
                  {/* ปรับความกว้าง w-60 */}
                  {/* --- ตรวจสอบการ Map subItems ตรงนี้ --- */}
                  {item.subItems.map((subItem) => (
                    <li key={subItem.path}>
                      {/* ใช้ Link และ Style ตรงๆ หรือจะใช้ NavLink ก็ได้ แต
                           ่ active state อาจจะต้องปรับ */}
                      <Link
                        to={subItem.path}
                        // ใส่ class พื้นฐาน + active/hover สำหรับ dropdown item
                        className={`p-2 rounded-md flex items-center space-x-2 text-base text-neutral-focus group ${
                          isActive(subItem.path)
                            ? "bg-base-200 font-semibold"
                            : "hover:bg-base-200"
                        }`}
                      >
                        {React.createElement(subItem.icon, {
                          // แสดงไอคอนในเมนูย่อยด้วย
                          size: 16,
                          className:
                            "transition-transform duration-150 ease-in-out group-hover:rotate-12", // ใส่ animation
                        })}
                        <span>{subItem.text}</span>
                      </Link>
                    </li>
                  ))}
                  {/* --- ------------------------------ --- */}
                </ul>
              </div>
            ) : (
              // --- สิ้นสุด Dropdown ---
              // --- Render NavLink ปกติ ---
              // ใช้ div ครอบเพื่อให้ space-x-4 ทำงานกับ dropdown ด้วย
              <div key={item.path}>
                <NavLink
                  path={item.path}
                  icon={React.createElement(item.icon)}
                  text={item.text}
                />
              </div>
            )
          )}
        </div>
      </div>

      {/* navbar-end: Notifications & Logout */}
      <div className="navbar-end flex items-center space-x-2">
        {/* Notification Bell - Only for students */}
        {role === 'student' && (
          <NotificationBell />
        )}
        
        <button
          onClick={logout}
          className="btn btn-ghost btn-sm hidden md:inline-flex items-center space-x-2 text-error hover:bg-base-200 text-base rounded-md group"
        >
          <LogOut
            size={16}
            className="transition-transform duration-150 ease-in-out group-hover:rotate-12"
          />
          <span>ออกจากระบบ</span>
        </button>
      </div>
    </div>
  );
};

export default NavBar;