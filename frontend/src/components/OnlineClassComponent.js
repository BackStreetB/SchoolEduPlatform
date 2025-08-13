import React, { useState, useEffect } from 'react';
import API_ENDPOINTS from '../config/api';
import './OnlineClassComponent.css';

const OnlineClassComponent = ({ showNotification }) => {
  const [onlineClasses, setOnlineClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    grade: '',
    schedule: '',
    zoom_meeting_id: '',
    zoom_password: ''
  });

  useEffect(() => {
    fetchOnlineClasses();
  }, []);

  const fetchOnlineClasses = async () => {
    try {
      setLoading(true);
      const response = await fetch(API_ENDPOINTS.ONLINE_CLASS, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setOnlineClasses(data);
      } else {
        showNotification('Lỗi lấy danh sách lớp học', 'error');
      }
    } catch (error) {
      console.error('Error fetching online classes:', error);
      showNotification('Lỗi kết nối', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClass = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await fetch(API_ENDPOINTS.ONLINE_CLASS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        const newClass = await response.json();
        setOnlineClasses(prev => [newClass, ...prev]);
        setShowCreateForm(false);
        setFormData({
          title: '',
          subject: '',
          grade: '',
          schedule: '',
          zoom_meeting_id: '',
          zoom_password: ''
        });
        showNotification('Tạo lớp học thành công!', 'success');
      } else {
        const error = await response.json();
        showNotification(error.error || 'Lỗi tạo lớp học', 'error');
      }
    } catch (error) {
      console.error('Error creating online class:', error);
      showNotification('Lỗi kết nối', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClass = async (classId, zoomInfo) => {
    try {
      const response = await fetch(API_ENDPOINTS.ONLINE_CLASS_JOIN(classId), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify(zoomInfo)
      });
      
      if (response.ok) {
        const joinInfo = await response.json();
        
        // Mở Zoom meeting
        if (joinInfo.join_url) {
          window.open(joinInfo.join_url, '_blank');
          showNotification('Đang mở Zoom Meeting...', 'success');
        } else {
          showNotification('Thông tin tham gia: ' + JSON.stringify(joinInfo), 'info');
        }
      } else {
        const error = await response.json();
        showNotification(error.error || 'Lỗi tham gia lớp học', 'error');
      }
    } catch (error) {
      console.error('Error joining class:', error);
      showNotification('Lỗi kết nối', 'error');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const openClassDetails = async (classId) => {
    try {
      const response = await fetch(API_ENDPOINTS.ONLINE_CLASS_BY_ID(classId), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      
      if (response.ok) {
        const classData = await response.json();
        setSelectedClass(classData);
      } else {
        showNotification('Lỗi lấy thông tin lớp học', 'error');
      }
    } catch (error) {
      console.error('Error fetching class details:', error);
      showNotification('Lỗi kết nối', 'error');
    }
  };

  const closeClassDetails = () => {
    setSelectedClass(null);
  };

  if (loading) {
    return (
      <div className="online-class-container">
        <div className="loading">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="online-class-container">
      <div className="online-class-header">
        <h2>📚 Lớp học trực tuyến</h2>
        <button 
          className="btn btn-primary"
          onClick={() => setShowCreateForm(true)}
        >
          ➕ Tạo lớp học mới
        </button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="create-class-form">
          <h3>Tạo lớp học mới</h3>
          <form onSubmit={handleCreateClass}>
            <div className="form-group">
              <label>Tên lớp học:</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="VD: Lớp Toán 10A - Chương 1"
                required
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Môn học:</label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleInputChange}
                  placeholder="VD: Toán"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Lớp:</label>
                <input
                  type="text"
                  name="grade"
                  value={formData.grade}
                  onChange={handleInputChange}
                  placeholder="VD: 10A"
                  required
                />
              </div>
            </div>
            
            <div className="form-group">
              <label>Lịch học:</label>
              <input
                type="text"
                name="schedule"
                value={formData.schedule}
                onChange={handleInputChange}
                placeholder="VD: Thứ 2, 4, 6 - 19:00-20:30"
                required
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Zoom Meeting ID:</label>
                <input
                  type="text"
                  name="zoom_meeting_id"
                  value={formData.zoom_meeting_id}
                  onChange={handleInputChange}
                  placeholder="VD: 123456789"
                />
              </div>
              
              <div className="form-group">
                <label>Mật khẩu Zoom:</label>
                <input
                  type="text"
                  name="zoom_password"
                  value={formData.zoom_password}
                  onChange={handleInputChange}
                  placeholder="VD: 123456"
                />
              </div>
            </div>
            
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                Tạo lớp học
              </button>
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => setShowCreateForm(false)}
              >
                Hủy
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Online Classes List */}
      <div className="online-classes-list">
        {onlineClasses.length === 0 ? (
          <div className="no-classes">
            <p>Chưa có lớp học nào được tạo</p>
            <p>Hãy tạo lớp học đầu tiên!</p>
          </div>
        ) : (
          onlineClasses.map(onlineClass => (
            <div key={onlineClass.id} className="online-class-card">
              <div className="class-info">
                <h3>{onlineClass.title}</h3>
                <div className="class-details">
                  <span className="subject">📖 {onlineClass.subject}</span>
                  <span className="grade">👥 {onlineClass.grade}</span>
                  <span className="teacher">👨‍🏫 {onlineClass.teacher}</span>
                  <span className="schedule">⏰ {onlineClass.schedule}</span>
                </div>
                {onlineClass.next_class && (
                  <div className="next-class">
                    🎯 Lớp tiếp theo: {new Date(onlineClass.next_class).toLocaleString('vi-VN')}
                  </div>
                )}
              </div>
              
              <div className="class-actions">
                <button 
                  className="btn btn-primary"
                  onClick={() => handleJoinClass(onlineClass.id, {
                    zoom_meeting_id: onlineClass.zoom_meeting_id,
                    zoom_password: onlineClass.zoom_password
                  })}
                >
                  🚀 Tham gia
                </button>
                <button 
                  className="btn btn-secondary"
                  onClick={() => openClassDetails(onlineClass.id)}
                >
                  📋 Chi tiết
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Class Details Modal */}
      {selectedClass && (
        <div className="modal-overlay" onClick={closeClassDetails}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedClass.title}</h3>
              <button className="close-btn" onClick={closeClassDetails}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="class-details-full">
                <div className="detail-item">
                  <strong>Môn học:</strong> {selectedClass.subject}
                </div>
                <div className="detail-item">
                  <strong>Lớp:</strong> {selectedClass.grade}
                </div>
                <div className="detail-item">
                  <strong>Giáo viên:</strong> {selectedClass.teacher}
                </div>
                <div className="detail-item">
                  <strong>Lịch học:</strong> {selectedClass.schedule}
                </div>
                <div className="detail-item">
                  <strong>Meeting ID:</strong> {selectedClass.zoom_meeting_id}
                </div>
                <div className="detail-item">
                  <strong>Mật khẩu:</strong> {selectedClass.zoom_password}
                </div>
                {selectedClass.description && (
                  <div className="detail-item">
                    <strong>Mô tả:</strong> {selectedClass.description}
                  </div>
                )}
              </div>
              
              {selectedClass.materials && selectedClass.materials.length > 0 && (
                <div className="materials-section">
                  <h4>📚 Tài liệu học tập</h4>
                  <div className="materials-list">
                    {selectedClass.materials.map((material, index) => (
                      <div key={index} className="material-item">
                        <span>{material.name}</span>
                        <a href={material.url} target="_blank" rel="noopener noreferrer">
                          📥 Tải xuống
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedClass.recordings && selectedClass.recordings.length > 0 && (
                <div className="recordings-section">
                  <h4>🎥 Ghi âm buổi học</h4>
                  <div className="recordings-list">
                    {selectedClass.recordings.map((recording, index) => (
                      <div key={index} className="recording-item">
                        <span>{recording.name}</span>
                        <span className="duration">⏱️ {recording.duration}</span>
                        <a href={recording.url} target="_blank" rel="noopener noreferrer">
                          ▶️ Xem
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="modal-actions">
                <button 
                  className="btn btn-primary"
                  onClick={() => handleJoinClass(selectedClass.id, {
                    zoom_meeting_id: selectedClass.zoom_meeting_id,
                    zoom_password: selectedClass.zoom_password
                  })}
                >
                  🚀 Tham gia ngay
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OnlineClassComponent;
