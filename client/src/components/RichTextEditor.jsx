import React from 'react';
import MDEditor from '@uiw/react-md-editor';

const RichTextEditor = ({ value, onChange, placeholder = "เริ่มเขียนเนื้อหา..." }) => {
  return (
    <div className="w-full" data-color-mode="light">
      <MDEditor
        value={value}
        onChange={(val) => onChange(val || '')}
        preview="edit"
        hideToolbar={false}
        textareaProps={{
          placeholder: placeholder,
          style: {
            fontFamily: "'Sarabun', 'Sukhumvit Set', Arial, sans-serif",
            fontSize: '14px',
            lineHeight: '1.75'
          }
        }}
        height={400}
        data-color-mode="light"
      />
      <style>{`
        .w-md-editor {
          background-color: white !important;
        }
        .w-md-editor-text-input, 
        .w-md-editor-text-container, 
        .w-md-editor-text {
          font-family: 'Sarabun', 'Sukhumvit Set', Arial, sans-serif !important;
          color: #374151 !important;
        }
        .w-md-editor.w-md-editor-focus {
          border-color: #f97316 !important;
          box-shadow: 0 0 0 2px rgba(249, 115, 22, 0.2) !important;
        }
      `}</style>
    </div>
  );
};

export default RichTextEditor;