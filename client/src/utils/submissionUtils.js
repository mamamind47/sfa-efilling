// Utility functions for submission-related operations


/**
 * Get submission status badge configuration
 * @param {Object} submission - The submission object
 * @returns {Object} - Badge configuration with color and text
 */
export const getSubmissionStatusConfig = (submission) => {
  const status = submission.status_logs?.[0]?.status || submission.status || "submitted";
  
  switch (status) {
    case "approved":
      return {
        status: "approved",
        text: "อนุมัติแล้ว",
        color: "success",
        bgColor: "bg-green-100",
        textColor: "text-green-800",
        iconColor: "text-green-500"
      };
    case "rejected":
      return {
        status: "rejected", 
        text: "ปฏิเสธแล้ว",
        color: "error",
        bgColor: "bg-red-100",
        textColor: "text-red-800",
        iconColor: "text-red-500"
      };
    default:
      return {
        status: "submitted",
        text: "รอดำเนินการ",
        color: "warning", 
        bgColor: "bg-yellow-100",
        textColor: "text-yellow-800",
        iconColor: "text-yellow-500"
      };
  }
};

/**
 * Format Thai date with Buddhist Era
 * @param {string|Date} date - Date to format
 * @param {string} format - Date format (optional)
 * @returns {string} - Formatted date string
 */
export const formatThaiDate = (date, format = "D MMMM BBBB") => {
  if (!date) return "-";
  
  const dayjs = require("dayjs");
  require("dayjs/locale/th");
  const buddhistEra = require("dayjs/plugin/buddhistEra");
  
  dayjs.locale("th");
  dayjs.extend(buddhistEra);
  
  return dayjs(date).format(format);
};

/**
 * Get activity type mapping for various display purposes
 * @param {string} type - The submission type
 * @returns {Object} - Activity type information
 */
export const getActivityTypeInfo = (type) => {
  const displayName = getSubmissionTypeDisplayName(type);
  
  const typeMap = {
    "BloodDonate": {
      displayName,
      description: "สำหรับผู้ที่มีใบรับรองบริจาคเลือด",
      icon: "HeartPulse",
      color: "text-red-500"
    },
    "Certificate": {
      displayName,
      description: "เช่น SET e-Learning",
      icon: "GraduationCap", 
      color: "text-blue-500"
    },
    "NSF": {
      displayName,
      description: "แนบ Statement และเกียรติบัตร (ถ้ามี)",
      icon: "PiggyBank",
      color: "text-rose-500"
    },
    "AOM YOUNG": {
      displayName,
      description: "แนบสลิปการลงทุน และ รายการเดินบัญชีกองทุน (Statement)",
      icon: "LineChart",
      color: "text-green-600"
    },
    "ต้นไม้ล้านต้น ล้านความดี": {
      displayName,
      description: "แนบรูปภาพขณะปลูกต้นไม้ และเกียรติบัตร",
      icon: "TreePine",
      color: "text-green-600"
    },
    "religious": {
      displayName,
      description: "แนบรูปภาพขณะทำกิจกรรม พร้อมเอกสารแบบฟอร์มจิตอาสา",
      icon: "Church",
      color: "text-yellow-600"
    },
    "social-development": {
      displayName,
      description: "เฉพาะกิจกรรมที่ไม่ใช่เป็นกิจกรรมมหาวิทยาลัยเท่านั้น",
      icon: "School", 
      color: "text-blue-600"
    }
  };
  
  return typeMap[type] || {
    displayName,
    description: "",
    icon: "FileText",
    color: "text-gray-500"
  };
};