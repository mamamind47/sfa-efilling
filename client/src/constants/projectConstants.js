// Project type labels
export const PROJECT_TYPE_LABELS = {
  religious: 'ทำนุบำรุงศาสนสถาน',
  social_development: 'พัฒนาโรงเรียน/ชุมชน',
  university_activity: 'กิจกรรมภายในมหาวิทยาลัย'
};

// Project status labels
export const PROJECT_STATUS_LABELS = {
  draft: 'ฉบับร่าง',
  submitted: 'รอการอนุมัติ',
  approved: 'อนุมัติแล้ว',
  rejected: 'ไม่อนุมัติ'
};

// Project status colors (for badges/UI)
export const PROJECT_STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-700',
  submitted: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700'
};

// Participant status labels
export const PARTICIPANT_STATUS_LABELS = {
  pending: 'รอการอนุมัติ',
  approved: 'อนุมัติแล้ว',
  rejected: 'ไม่อนุมัติ'
};

// Participant status colors
export const PARTICIPANT_STATUS_COLORS = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700'
};

// Required documents for each project type
export const REQUIRED_DOCUMENTS = {
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
