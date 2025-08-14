import React, { useState, useRef } from 'react';
import './MediaUpload.css';

const MediaUpload = ({ onMediaChange, existingMedia = [], maxFiles = 5, acceptTypes = ['image/*', 'video/*'] }) => {
  const [mediaFiles, setMediaFiles] = useState(existingMedia);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = (files) => {
    console.log('📁 MediaUpload: Files selected:', files);
    
    const newFiles = Array.from(files).map(file => ({
      file,
      id: Date.now() + Math.random(),
      type: file.type.startsWith('image/') ? 'image' : 'video',
      url: URL.createObjectURL(file),
      name: file.name,
      size: file.size
    }));

    console.log('📁 MediaUpload: New files processed:', newFiles);

    const updatedFiles = [...mediaFiles, ...newFiles].slice(0, maxFiles);
    console.log('📁 MediaUpload: Updated files array:', updatedFiles);
    
    setMediaFiles(updatedFiles);
    onMediaChange(updatedFiles);
    
    console.log('📁 MediaUpload: onMediaChange called with:', updatedFiles);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const removeFile = (fileId) => {
    const updatedFiles = mediaFiles.filter(file => file.id !== fileId);
    setMediaFiles(updatedFiles);
    onMediaChange(updatedFiles);
  };

  const openFileSelector = () => {
    fileInputRef.current?.click();
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="media-upload">
      <div className="upload-header">
        <h4>Media Files</h4>
        <span className="file-count">{mediaFiles.length}/{maxFiles}</span>
      </div>

      {/* Drag & Drop Zone */}
      <div
        className={`drag-drop-zone ${dragActive ? 'drag-active' : ''} ${mediaFiles.length >= maxFiles ? 'disabled' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={mediaFiles.length >= maxFiles ? undefined : openFileSelector}
      >
        {mediaFiles.length === 0 ? (
          <div className="upload-placeholder">
            <div className="upload-icon">📁</div>
            <p>Kéo thả ảnh/video vào đây hoặc click để chọn</p>
            <small>Hỗ trợ: JPG, PNG, GIF, MP4, MOV (Tối đa {maxFiles} file)</small>
          </div>
        ) : (
          <div className="media-grid">
            {mediaFiles.map((file) => (
              <div key={file.id} className="media-item">
                {file.type === 'image' ? (
                  <img src={file.url} alt={file.name} className="media-preview" />
                ) : (
                  <video src={file.url} className="media-preview" muted />
                )}
                
                <div className="media-info">
                  <span className="file-name">{file.name}</span>
                  <span className="file-size">{formatFileSize(file.size)}</span>
                </div>
                
                <button
                  className="remove-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(file.id);
                  }}
                  title="Xóa file"
                >
                  ×
                </button>
              </div>
            ))}
            
            {mediaFiles.length < maxFiles && (
              <div className="add-more" onClick={openFileSelector}>
                <div className="add-icon">+</div>
                <span>Thêm file</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptTypes.join(',')}
        onChange={(e) => handleFileSelect(e.target.files)}
        style={{ display: 'none' }}
      />

      {/* Upload tips */}
      <div className="upload-tips">
        <p><strong>Lưu ý:</strong></p>
        <ul>
          <li>Hỗ trợ ảnh: JPG, PNG, GIF (tối đa 5MB/file)</li>
          <li>Hỗ trợ video: MP4, MOV (tối đa 50MB/file)</li>
          <li>Tối đa {maxFiles} file</li>
        </ul>
      </div>
    </div>
  );
};

export default MediaUpload;
