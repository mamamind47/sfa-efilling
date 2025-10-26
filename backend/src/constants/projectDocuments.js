// Required documents for each project type
const REQUIRED_DOCUMENTS = {
  religious: [
    {
      type: 'ACTIVITY_PHOTO',
      label: 'รูปภาพขณะทำกิจกรรม',
      required: true,
      multiple: true,
      accept: 'image/*'
    },
    {
      type: 'CERTIFICATE',
      label: 'เอกสารรับรอง',
      required: true,
      multiple: false,
      accept: 'image/*,.pdf'
    },
    {
      type: 'OTHER',
      label: 'เอกสารอื่นๆ',
      required: false,
      multiple: true,
      accept: 'image/*,.pdf,.doc,.docx'
    }
  ],
  social_development: [
    {
      type: 'ACTIVITY_PHOTO',
      label: 'รูปภาพขณะทำกิจกรรม',
      required: true,
      multiple: true,
      accept: 'image/*'
    },
    {
      type: 'CERTIFICATE',
      label: 'เอกสารรับรอง',
      required: true,
      multiple: false,
      accept: 'image/*,.pdf'
    },
    {
      type: 'OTHER',
      label: 'เอกสารอื่นๆ',
      required: false,
      multiple: true,
      accept: 'image/*,.pdf,.doc,.docx'
    }
  ],
  university_activity: [
    {
      type: 'ACTIVITY_PHOTO',
      label: 'รูปภาพกิจกรรม',
      required: true,
      multiple: true,
      accept: 'image/*'
    },
    {
      type: 'OTHER',
      label: 'เอกสารอื่นๆ',
      required: false,
      multiple: true,
      accept: 'image/*,.pdf,.doc,.docx'
    }
  ]
};

// Project type labels
const PROJECT_TYPE_LABELS = {
  religious: 'ทำนุบำรุงศาสนสถาน',
  social_development: 'พัฒนาโรงเรียน/ชุมชน',
  university_activity: 'กิจกรรมภายในมหาวิทยาลัย'
};

// Project status labels
const PROJECT_STATUS_LABELS = {
  draft: 'ฉบับร่าง',
  submitted: 'รอการอนุมัติ',
  approved: 'อนุมัติแล้ว',
  rejected: 'ไม่อนุมัติ'
};

// Participant status labels
const PARTICIPANT_STATUS_LABELS = {
  pending: 'รอการอนุมัติ',
  approved: 'อนุมัติแล้ว',
  rejected: 'ไม่อนุมัติ'
};

module.exports = {
  REQUIRED_DOCUMENTS,
  PROJECT_TYPE_LABELS,
  PROJECT_STATUS_LABELS,
  PARTICIPANT_STATUS_LABELS
};
