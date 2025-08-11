import React, { useState, useEffect } from 'react';
import './App.css';
import API_ENDPOINTS from './config/api';

// Global helper functions
const isImage = (fileName) => {
  return /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);
};

const isVideo = (fileName) => {
  return /\.(mp4|webm|ogg|mov|avi)$/i.test(fileName);
};

// Helper function to format date to dd/mm/yyyy
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  
  return `${day}/${month}/${year}`;
};

// Helper function to convert dd/mm/yyyy to yyyy-mm-dd for input fields
const formatDateForInput = (dateString) => {
  if (!dateString) return '';
  const parts = dateString.split('/');
  if (parts.length !== 3) return '';
  
  const day = parts[0];
  const month = parts[1];
  const year = parts[2];
  
  return `${year}-${month}-${day}`;
};

// Helper function để format time từ HH:MM:SS thành HH:MM
const formatTime = (timeString) => {
  if (!timeString) return '';
  // Nếu là format HH:MM:SS, cắt bỏ giây
  if (timeString.includes(':') && timeString.split(':').length === 3) {
    return timeString.substring(0, 5); // Lấy HH:MM
  }
  return timeString;
};

// Events Component
const EventsComponent = ({ onEventCreated, showNotification }) => {
  const [events, setEvents] = useState([]);
  const [publicEvents, setPublicEvents] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showViewForm, setShowViewForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [viewingEvent, setViewingEvent] = useState(null);
  const [showPublicEvents, setShowPublicEvents] = useState(false);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [selectedEventParticipants, setSelectedEventParticipants] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    start_time: '',
    end_time: '',
    color: 'blue'
  });
  const [loading, setLoading] = useState(false);

  // Function to get event color
  const getEventColor = (color) => {
    switch (color) {
      case 'blue': return '#3B82F6';
      case 'green': return '#10B981';
      case 'orange': return '#F59E0B';
      case 'red': return '#EF4444';
      default: return '#3B82F6';
    }
  };

  useEffect(() => {
    fetchPublicEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.EVENTS, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setEvents(data);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const fetchPublicEvents = async () => {
    try {
      const response = await fetch(`${API_ENDPOINTS.EVENTS}/public/all`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setPublicEvents(data);
      }
    } catch (error) {
      console.error('Error fetching public events:', error);
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Validation
    if (!formData.title || !formData.start_date || !formData.end_date) {
      showNotification('Vui lòng điền đầy đủ thông tin bắt buộc', 'error');
      setLoading(false);
      return;
    }
    
    // Debug: Log form data
    console.log('Creating event with data:', formData);
    
    try {
      const response = await fetch(API_ENDPOINTS.EVENTS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        const newEvent = await response.json();
        setShowCreateForm(false);
        setFormData({
          title: '',
          description: '',
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date().toISOString().split('T')[0],
          start_time: '',
          end_time: '',
          color: 'blue'
        });
        fetchPublicEvents();
        showNotification('Tạo sự kiện thành công!', 'success');
        // Update calendar in real-time
        if (onEventCreated) {
          onEventCreated(newEvent);
        }
        // Refresh calendar data immediately
        if (window.fetchCalendarData) {
          window.fetchCalendarData();
        }
      } else {
        const error = await response.json();
        console.error('Event creation error:', error);
        showNotification(error.error || 'Lỗi tạo sự kiện', 'error');
      }
    } catch (error) {
      console.error('Error creating event:', error);
      showNotification('Lỗi tạo sự kiện', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm('Bạn có chắc muốn xóa sự kiện này?')) return;
    
    try {
      const response = await fetch(`${API_ENDPOINTS.EVENTS}/${eventId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      
      if (response.ok) {
        fetchEvents();
      } else {
        const error = await response.json();
        showNotification(error.error || 'Lỗi xóa sự kiện', 'error');
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      showNotification('Lỗi xóa sự kiện', 'error');
    }
  };

  const handleJoinEvent = async (eventId) => {
    try {
      const response = await fetch(`${API_ENDPOINTS.EVENTS}/${eventId}/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      
      if (response.ok) {
        showNotification('Đã tham gia sự kiện thành công!', 'success');
        fetchPublicEvents(); // Refresh danh sách
        // Tự động cập nhật calendar
        if (onEventCreated) {
          onEventCreated();
        }
      } else {
        const error = await response.json();
        showNotification(error.error || 'Lỗi tham gia sự kiện', 'error');
      }
    } catch (error) {
      console.error('Error joining event:', error);
      showNotification('Lỗi tham gia sự kiện', 'error');
    }
  };

  const handleLeaveEvent = async (eventId) => {
    try {
      const response = await fetch(`${API_ENDPOINTS.EVENTS}/${eventId}/leave`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      
      if (response.ok) {
        showNotification('Đã rời khỏi sự kiện thành công!', 'success');
        fetchPublicEvents(); // Refresh danh sách
        // Tự động cập nhật calendar
        if (onEventCreated) {
          onEventCreated();
        }
      } else {
        const error = await response.json();
        showNotification(error.error || 'Lỗi rời khỏi sự kiện', 'error');
      }
    } catch (error) {
      console.error('Error leaving event:', error);
      showNotification('Lỗi rời khỏi sự kiện', 'error');
    }
  };

  const canEditEvent = (event) => {
    const today = new Date().toISOString().split('T')[0];
    const eventDate = new Date(event.start_date).toISOString().split('T')[0];
    const canEdit = eventDate >= today;
    console.log('Event:', event.title, 'Date:', eventDate, 'Today:', today, 'Can edit:', canEdit);
    return canEdit;
  };

  const openViewForm = (event) => {
    setViewingEvent(event);
    setShowViewForm(true);
  };

  const openEditForm = (event) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description,
      start_date: event.start_date,
      end_date: event.end_date,
      start_time: event.start_time,
      end_time: event.end_time,
      color: event.color
    });
    setShowEditForm(true);
  };

  const openParticipantsList = async (event) => {
    try {
      const response = await fetch(`${API_ENDPOINTS.EVENTS}/${event.id}/participants`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      
      if (response.ok) {
        const participants = await response.json();
        setSelectedEventParticipants(participants);
        setShowParticipantsModal(true);
      } else {
        console.error('Error fetching participants:', response.status);
        setSelectedEventParticipants(event.participants || []);
        setShowParticipantsModal(true);
      }
    } catch (error) {
      console.error('Error fetching participants:', error);
      setSelectedEventParticipants(event.participants || []);
      setShowParticipantsModal(true);
    }
  };

  const handleEditEvent = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${API_ENDPOINTS.EVENTS}/${editingEvent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        setShowEditForm(false);
        setEditingEvent(null);
        setFormData({
          title: '',
          description: '',
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date().toISOString().split('T')[0],
          start_time: '',
          end_time: '',
          color: 'blue'
        });
        fetchPublicEvents();
        if (onEventCreated) {
          onEventCreated();
        }
      } else {
        const error = await response.json();
        showNotification(error.error || 'Lỗi cập nhật sự kiện', 'error');
      }
    } catch (error) {
      console.error('Error updating event:', error);
      showNotification('Lỗi cập nhật sự kiện', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="events-container">
      <div className="events-header">
        <h2>📅 Sự kiện</h2>
        <button 
          className="btn-primary"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? 'Đóng' : 'Tạo sự kiện mới'}
        </button>
      </div>

      {showCreateForm && (
        <div className="create-event-form">
          <h3>Tạo sự kiện</h3>
          <form onSubmit={handleCreateEvent}>
            <div className="form-group">
              <label>Tiêu đề:</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                required
                placeholder="Nhập tiêu đề sự kiện..."
              />
            </div>
            
            <div className="form-group">
              <label>Mô tả:</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Mô tả chi tiết sự kiện..."
                rows="4"
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Từ ngày:</label>
                <input
                  type="date"
                  value={formData.start_date || ''}
                  onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Đến ngày:</label>
                <input
                  type="date"
                  value={formData.end_date || ''}
                  onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                  required
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Giờ bắt đầu:</label>
                <input
                  type="time"
                  value={formData.start_time || ''}
                  onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                  step="60"
                />
              </div>
              
              <div className="form-group">
                <label>Giờ kết thúc:</label>
                <input
                  type="time"
                  value={formData.end_time || ''}
                  onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                  step="60"
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Màu sự kiện:</label>
                <div className="color-picker">
                  <div 
                    className={`color-option ${formData.color === 'blue' ? 'selected' : ''}`}
                    onClick={() => setFormData({...formData, color: 'blue'})}
                    style={{ backgroundColor: '#3B82F6' }}
                    title="Xanh dương"
                  ></div>
                  <div 
                    className={`color-option ${formData.color === 'green' ? 'selected' : ''}`}
                    onClick={() => setFormData({...formData, color: 'green'})}
                    style={{ backgroundColor: '#10B981' }}
                    title="Xanh lá"
                  ></div>
                  <div 
                    className={`color-option ${formData.color === 'orange' ? 'selected' : ''}`}
                    onClick={() => setFormData({...formData, color: 'orange'})}
                    style={{ backgroundColor: '#F59E0B' }}
                    title="Cam"
                  ></div>
                  <div 
                    className={`color-option ${formData.color === 'red' ? 'selected' : ''}`}
                    onClick={() => setFormData({...formData, color: 'red'})}
                    style={{ backgroundColor: '#EF4444' }}
                    title="Đỏ"
                  ></div>
                </div>
              </div>
            </div>
            
            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Đang tạo...' : 'Tạo sự kiện'}
              </button>
              <button 
                type="button" 
                className="btn-secondary"
                onClick={() => setShowCreateForm(false)}
              >
                Hủy
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Event Form */}
      {showEditForm && editingEvent && (
        <div className="create-event-form">
          <h3>Chỉnh sửa sự kiện</h3>
          <form onSubmit={handleEditEvent}>
            <div className="form-group">
              <label>Tiêu đề:</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                required
                placeholder="Nhập tiêu đề sự kiện..."
              />
            </div>
            
            <div className="form-group">
              <label>Mô tả:</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Mô tả chi tiết sự kiện..."
                rows="4"
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Từ ngày:</label>
                <input
                  type="date"
                  value={formData.start_date || ''}
                  onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Đến ngày:</label>
                <input
                  type="date"
                  value={formData.end_date || ''}
                  onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                  required
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Giờ bắt đầu:</label>
                <input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                  step="60"
                />
              </div>
              
              <div className="form-group">
                <label>Giờ kết thúc:</label>
                <input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                  step="60"
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Màu sự kiện:</label>
                <div className="color-picker">
                  <div 
                    className={`color-option ${formData.color === 'blue' ? 'selected' : ''}`}
                    onClick={() => setFormData({...formData, color: 'blue'})}
                    style={{ backgroundColor: '#3B82F6' }}
                    title="Xanh dương"
                  ></div>
                  <div 
                    className={`color-option ${formData.color === 'green' ? 'selected' : ''}`}
                    onClick={() => setFormData({...formData, color: 'green'})}
                    style={{ backgroundColor: '#10B981' }}
                    title="Xanh lá"
                  ></div>
                  <div 
                    className={`color-option ${formData.color === 'orange' ? 'selected' : ''}`}
                    onClick={() => setFormData({...formData, color: 'orange'})}
                    style={{ backgroundColor: '#F59E0B' }}
                    title="Cam"
                  ></div>
                  <div 
                    className={`color-option ${formData.color === 'red' ? 'selected' : ''}`}
                    onClick={() => setFormData({...formData, color: 'red'})}
                    style={{ backgroundColor: '#EF4444' }}
                    title="Đỏ"
                  ></div>
                </div>
              </div>
            </div>
            
            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Đang cập nhật...' : 'Cập nhật sự kiện'}
              </button>
              <button 
                type="button" 
                className="btn-secondary"
                onClick={() => {
                  setShowEditForm(false);
                  setEditingEvent(null);
                }}
              >
                Hủy
              </button>
            </div>
          </form>
        </div>
      )}

      {/* View Event Modal */}
      {showViewForm && viewingEvent && (
        <div className="modal-overlay">
          <div className="event-view">
            <div className="event-view-header">
              <h3>{viewingEvent.title}</h3>
              <button 
                className="btn-close"
                onClick={() => {
                  setShowViewForm(false);
                  setViewingEvent(null);
                }}
              >
                ✕
              </button>
            </div>
            
            <div className="event-view-content">
              <div className="event-view-meta">
                <p><strong>Từ:</strong> {formatDate(viewingEvent.start_date)}
                {viewingEvent.start_time && ` ${viewingEvent.start_time}`}
              </p>
              <p><strong>Đến:</strong> {formatDate(viewingEvent.end_date)}
                {viewingEvent.end_time && ` ${viewingEvent.end_time}`}
              </p>
                {viewingEvent.description && (
                  <p><strong>Mô tả:</strong> {viewingEvent.description}</p>
                )}
              </div>
              
              <div className="event-view-actions">
                {canEditEvent(viewingEvent) && (
                  <button 
                    className="btn-edit"
                    onClick={() => {
                      setShowViewForm(false);
                      openEditForm(viewingEvent);
                    }}
                  >
                    ✏️ Chỉnh sửa
                  </button>
                )}
                <button 
                  className="btn-secondary"
                  onClick={() => {
                    setShowViewForm(false);
                    setViewingEvent(null);
                  }}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="events-list">
        {publicEvents.length === 0 ? (
          <div className="empty-state">
            <p>Chưa có sự kiện nào. Hãy tạo sự kiện đầu tiên!</p>
          </div>
        ) : (
          publicEvents.map(event => {
            const isParticipant = event.participants?.some(p => p.user_id === parseInt(localStorage.getItem('userId')));
            const isOwner = event.user_id === parseInt(localStorage.getItem('userId'));
            
            return (
              <div key={event.id} className="event-card" style={{ borderLeft: `4px solid ${getEventColor(event.color)}` }}>
                <div className="event-header">
                  <h3>{event.title}</h3>
                  {event.creator_name && (
                    <span className="event-creator">Tạo bởi: {event.creator_name}</span>
                  )}
                </div>
                
                <div className="event-date">
                  <strong>Từ:</strong> {formatDate(event.start_date)}
                  {event.start_time && ` ${formatTime(event.start_time)}`}
                  <br />
                  <strong>Đến:</strong> {formatDate(event.end_date)}
                  {event.end_time && ` ${formatTime(event.end_time)}`}
                </div>
                
                {event.description && (
                  <div className="event-description">
                    <strong>Mô tả:</strong> {event.description}
                  </div>
                )}
                
                <div className="event-participants">
                  <strong>Người tham gia:</strong> {event.participants ? event.participants.length : 0} người
                  <button 
                    className="btn-participants" 
                    onClick={() => openParticipantsList(event)}
                    title="Xem danh sách người tham gia"
                    style={{
                      marginLeft: '10px',
                      padding: '2px 8px',
                      fontSize: '12px',
                      backgroundColor: '#f0f0f0',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    👥 Danh sách
                  </button>
                </div>
                
                <div className="event-actions">
                  <button 
                    className="btn-view" 
                    onClick={() => openViewForm(event)}
                    title="Xem sự kiện"
                  >
                    👁️
                  </button>
                  {!isOwner && (
                    isParticipant ? (
                      <button 
                        className="btn-leave" 
                        onClick={() => handleLeaveEvent(event.id)}
                        title="Rời khỏi sự kiện"
                      >
                        🚪
                      </button>
                    ) : (
                      <button 
                        className="btn-join" 
                        onClick={() => handleJoinEvent(event.id)}
                        title="Tham gia sự kiện"
                      >
                        ➕
                      </button>
                    )
                  )}
                  {canEditEvent(event) && (
                    <>
                      <button 
                        className="btn-edit" 
                        onClick={() => openEditForm(event)}
                        title="Chỉnh sửa"
                      >
                        ✏️
                      </button>
                      <button 
                        className="btn-delete" 
                        onClick={() => handleDeleteEvent(event.id)}
                        title="Xóa"
                      >
                        🗑️
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal hiển thị danh sách người tham gia */}
      {showParticipantsModal && (
        <div className="modal-overlay">
          <div className="modal-content participants-modal">
            <div className="modal-header">
              <h3>👥 Danh sách người tham gia</h3>
              <button 
                className="modal-close" 
                onClick={() => setShowParticipantsModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              {selectedEventParticipants.length > 0 ? (
                <div className="participants-list">
                  {selectedEventParticipants.map((participant, index) => (
                    <div key={index} className="participant-item">
                      <div className="participant-info">
                        <span className="participant-name">{participant.user_name}</span>
                        <span className="participant-date">
                          Tham gia: {new Date(participant.joined_at).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-participants">Chưa có người tham gia nào.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Diary Component
const DiaryComponent = ({ onDiaryCreated, showNotification }) => {
  const [diaries, setDiaries] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showViewForm, setShowViewForm] = useState(false);
  const [editingDiary, setEditingDiary] = useState(null);
  const [viewingDiary, setViewingDiary] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    content: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDiaries();
  }, []);

  const fetchDiaries = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.DIARY, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setDiaries(data);
      }
    } catch (error) {
      console.error('Error fetching diaries:', error);
    }
  };

  const handleCreateDiary = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.DIARY, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        const newDiary = await response.json();
        setShowCreateForm(false);
        setFormData({
          title: '',
          content: ''
        });
        fetchDiaries();
        if (onDiaryCreated) {
          onDiaryCreated(newDiary);
        }
      } else {
        const error = await response.json();
        showNotification(error.error || 'Lỗi tạo nhật ký', 'error');
      }
    } catch (error) {
      console.error('Error creating diary:', error);
      showNotification('Lỗi tạo nhật ký', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEditDiary = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${API_ENDPOINTS.DIARY}/${editingDiary.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        const updatedDiary = await response.json();
        setShowEditForm(false);
        setEditingDiary(null);
        setFormData({
          title: '',
          content: ''
        });
        fetchDiaries();
      } else {
        const error = await response.json();
        showNotification(error.error || 'Lỗi cập nhật nhật ký', 'error');
      }
    } catch (error) {
      console.error('Error updating diary:', error);
      showNotification('Lỗi cập nhật nhật ký', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDiary = async (diaryId) => {
    if (!window.confirm('Bạn có chắc muốn xóa nhật ký này?')) return;
    
    try {
      const response = await fetch(`${API_ENDPOINTS.DIARY}/${diaryId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      
      if (response.ok) {
        fetchDiaries();
      } else {
        const error = await response.json();
        showNotification(error.error || 'Lỗi xóa nhật ký', 'error');
      }
    } catch (error) {
      console.error('Error deleting diary:', error);
      showNotification('Lỗi xóa nhật ký', 'error');
    }
  };

  const openEditForm = (diary) => {
    setEditingDiary(diary);
    setFormData({
      title: diary.title,
      content: diary.content
    });
    setShowEditForm(true);
  };

  const openViewForm = (diary) => {
    setViewingDiary(diary);
    setShowViewForm(true);
  };

  const canEditDiary = (diary) => {
    // Sử dụng local time thay vì UTC
    const today = new Date().toLocaleDateString('en-CA'); // Format: YYYY-MM-DD
    
    // Sử dụng created_at vì database không có trường date riêng
    const diaryDate = new Date(diary.created_at).toLocaleDateString('en-CA');
    
    const canEdit = diaryDate === today;
    console.log('Diary:', diary.title, 'Date:', diaryDate, 'Today:', today, 'Can edit:', canEdit, 'Diary object:', diary);
    
    // Debug thêm
    console.log('Today object:', new Date());
    console.log('Today local:', new Date().toLocaleDateString('en-CA'));
    console.log('Diary created_at:', diary.created_at);
    
    return canEdit;
  };



  return (
    <div className="diary-section">
      <div className="section-header">
        <h2>📝 Nhật ký cá nhân</h2>
        <button 
          className="btn-primary" 
          onClick={() => setShowCreateForm(true)}
        >
          Viết nhật ký mới
        </button>
      </div>

      {/* Create Diary Form */}
      {showCreateForm && (
        <div className="modal-overlay" onClick={() => setShowCreateForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Viết nhật ký mới</h3>
              <button className="modal-close" onClick={() => setShowCreateForm(false)}>×</button>
            </div>
            <form onSubmit={handleCreateDiary} className="modal-form">
              <div className="form-group">
                <label>Tiêu đề:</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="Nhập tiêu đề nhật ký..."
                />
              </div>
              
              <div className="form-group">
                <label>Nội dung:</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                  placeholder="Viết về ngày hôm nay của bạn..."
                  rows="6"
                />
              </div>
              

              
              <div className="form-actions">
                <button type="button" onClick={() => setShowCreateForm(false)} className="btn-secondary">
                  Hủy
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Đang tạo...' : 'Tạo nhật ký'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Diary Form */}
      {showEditForm && (
        <div className="modal-overlay" onClick={() => setShowEditForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Chỉnh sửa nhật ký</h3>
              <button className="modal-close" onClick={() => setShowEditForm(false)}>×</button>
            </div>
            <form onSubmit={handleEditDiary} className="modal-form">
              <div className="form-group">
                <label>Tiêu đề:</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="Nhập tiêu đề nhật ký..."
                />
              </div>
              
              <div className="form-group">
                <label>Nội dung:</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                  placeholder="Viết về ngày hôm nay của bạn..."
                  rows="6"
                />
              </div>
              

              
              <div className="form-actions">
                <button type="button" onClick={() => setShowEditForm(false)} className="btn-secondary">
                  Hủy
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Đang cập nhật...' : 'Cập nhật nhật ký'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Diary Modal */}
      {showViewForm && viewingDiary && (
        <div className="modal-overlay" onClick={() => setShowViewForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Xem nhật ký</h3>
              <button className="modal-close" onClick={() => setShowViewForm(false)}>×</button>
            </div>
            <div className="modal-content">
              <div className="diary-view">
                <div className="diary-view-header">
                  <h2>{viewingDiary.title}</h2>
                  <div className="diary-view-meta">
                    <span className="diary-time">
                      {new Date(viewingDiary.created_at).toLocaleTimeString('vi-VN', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>
                </div>
                <div className="diary-view-content">
                  <p>{viewingDiary.content}</p>
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button 
                type="button" 
                onClick={() => setShowViewForm(false)} 
                className="btn-secondary"
              >
                Đóng
              </button>
              {canEditDiary(viewingDiary) && (
                <button 
                  type="button" 
                  onClick={() => {
                    setShowViewForm(false);
                    openEditForm(viewingDiary);
                  }} 
                  className="btn-primary"
                >
                  Chỉnh sửa
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Diary List */}
      <div className="diary-list">
        {diaries.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📖</div>
            <h3>Chưa có nhật ký nào</h3>
            <p>Bắt đầu viết nhật ký để ghi lại những khoảnh khắc đáng nhớ</p>
            <button 
              className="btn-primary" 
              onClick={() => setShowCreateForm(true)}
            >
              Viết nhật ký đầu tiên
            </button>
          </div>
        ) : (
          diaries.map(diary => (
            <div key={diary.id} className="diary-card">
              <div className="diary-header">
                <div className="diary-info">
                  <h3 className="diary-title">{diary.title}</h3>
                  <div className="diary-meta">
                    <span className="diary-time">
                      {new Date(diary.created_at).toLocaleDateString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })} - {new Date(diary.created_at).toLocaleTimeString('vi-VN', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                    {!canEditDiary(diary) && (
                      <span className="read-only-badge" title="Chỉ có thể xem, không thể chỉnh sửa">
                        📖 Chỉ đọc
                      </span>
                    )}
                  </div>
                </div>
                <div className="diary-actions">
                  <button 
                    className="btn-view" 
                    onClick={() => openViewForm(diary)}
                    title="Xem nhật ký"
                  >
                    👁️
                  </button>
                  {canEditDiary(diary) ? (
                    <>
                      <button 
                        className="btn-edit" 
                        onClick={() => openEditForm(diary)}
                        title="Chỉnh sửa"
                      >
                        ✏️
                      </button>
                      <button 
                        className="btn-delete" 
                        onClick={() => handleDeleteDiary(diary.id)}
                        title="Xóa"
                      >
                        🗑️
                      </button>
                    </>
                  ) : (
                    <button 
                      className="btn-edit disabled" 
                      title="Chỉ có thể chỉnh sửa nhật ký trong ngày"
                      disabled
                    >
                      🔒
                    </button>
                  )}
                </div>
              </div>
              <div className="diary-content">
                <p>{diary.content}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// Community Component
const CommunityComponent = ({ 
  onPostCreated, 
  onUserClick, 
  currentUser,
  showReactionModal,
  setShowReactionModal,
  selectedPostReactions,
  setSelectedPostReactions,
  reactionStats,
  setReactionStats,
  showNotification
}) => {
  const [posts, setPosts] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [formData, setFormData] = useState({
    content: '',
    media: []
  });
  const [loading, setLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewFiles, setPreviewFiles] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        console.log('No access token found');
        return;
      }

      console.log('Fetching posts with token:', token.substring(0, 20) + '...');
      
      const response = await fetch(API_ENDPOINTS.COMMUNITY, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        cache: 'no-store'
      });

      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Posts data:', data);
        setPosts(data);
      } else {
        const errorText = await response.text();
        console.error('Failed to fetch posts:', response.status, errorText);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    
    files.forEach(file => {
      const fileName = file.name;
      const preview = URL.createObjectURL(file);
      
      const filePreview = {
        file: file,
        name: fileName,
        preview: preview,
        type: isImage(fileName) ? 'image' : isVideo(fileName) ? 'video' : 'unknown',
        isExisting: false
      };
      
      setSelectedFiles(prev => [...prev, file]);
      setPreviewFiles(prev => [...prev, filePreview]);
    });
  };



  const handleCreatePost = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('content', formData.content);
      
      selectedFiles.forEach(file => {
        formDataToSend.append('media', file);
      });

      const response = await fetch(API_ENDPOINTS.COMMUNITY, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: formDataToSend
      });
      
      if (response.ok) {
        const newPost = await response.json();
        setShowCreateForm(false);
        setFormData({
          content: '',
          media: []
        });
        setSelectedFiles([]);
        setPreviewFiles([]);
        
        // Cập nhật state posts trực tiếp thay vì gọi fetchPosts
        setPosts(prevPosts => [newPost, ...prevPosts]);
        
        if (onPostCreated) {
          onPostCreated(newPost);
        }
      } else {
        const error = await response.json();
        showNotification(error.error || 'Lỗi tạo bài viết', 'error');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      showNotification('Lỗi tạo bài viết', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Bạn có chắc muốn xóa bài viết này?')) return;
    
    try {
      const response = await fetch(`${API_ENDPOINTS.COMMUNITY}/${postId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      
      if (response.ok) {
        // Cập nhật state posts trực tiếp thay vì gọi fetchPosts
        setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
        showNotification('Đã xóa bài viết thành công!', 'success');
      } else {
        const error = await response.json();
        showNotification(error.error || 'Lỗi xóa bài viết', 'error');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      showNotification('Lỗi xóa bài viết', 'error');
    }
  };

  const openEditForm = (post) => {
    console.log('Opening edit form for post:', post);
    setEditingPost(post);
    setFormData({
      content: post.content,
      media: post.media || []
    });
    
    // Hiển thị media cũ trong previewFiles để có thể xóa
    if (post.media && post.media.length > 0) {
      const existingMedia = post.media.map((media, index) => {
        const fileName = media.file_name;
        // Thêm cache busting và encode URL đúng cách
        const cacheBuster = `?t=${Date.now()}`;
        const encodedFileName = encodeURIComponent(fileName);
        return {
          id: media.id,
          name: fileName,
          preview: `${API_ENDPOINTS.COMMUNITY_UPLOADS}/${encodedFileName}${cacheBuster}`,
          type: isImage(fileName) ? 'image' : isVideo(fileName) ? 'video' : 'unknown',
          isExisting: true,
          originalMedia: media
        };
      });
      console.log('Setting preview files:', existingMedia);
      setPreviewFiles(existingMedia);
    } else {
      setPreviewFiles([]);
    }
    
    setSelectedFiles([]);
    setShowEditForm(true);
  };

  const handleEditPost = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('content', formData.content);
      
      // Gửi media cũ (chỉ ID)
      const existingMediaIds = previewFiles
        .filter(file => file.isExisting)
        .map(file => file.id);
      
      console.log('🔍 Debug handleEditPost:', {
        editingPostId: editingPost.id,
        existingMediaIds: existingMediaIds,
        previewFiles: previewFiles,
        selectedFiles: selectedFiles
      });
      
      // Gửi existing_media - nếu rỗng thì gửi string rỗng
      if (existingMediaIds.length > 0) {
        formDataToSend.append('existing_media', JSON.stringify(existingMediaIds));
      } else {
        formDataToSend.append('existing_media', '');
      }
      
      // Gửi file mới
      selectedFiles.forEach(file => {
        formDataToSend.append('media', file);
      });

      const response = await fetch(`${API_ENDPOINTS.COMMUNITY}/${editingPost.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: formDataToSend
      });
      
      if (response.ok) {
        const updatedPost = await response.json();
        console.log('✅ Post updated successfully:', updatedPost);
        
        setShowEditForm(false);
        setEditingPost(null);
        setFormData({
          content: '',
          media: []
        });
        setSelectedFiles([]);
        setPreviewFiles([]);
        
        // Cập nhật state posts trực tiếp thay vì gọi fetchPosts
        setPosts(prevPosts => 
          prevPosts.map(post => 
            post.id === editingPost.id 
              ? {
                  ...post, // Giữ nguyên tất cả thông tin cũ
                  content: updatedPost.content,
                  media: updatedPost.media || [],
                  updated_at: updatedPost.updated_at,
                  // Đảm bảo giữ nguyên user_id để canEditPost hoạt động đúng
                  user_id: post.user_id
                }
              : post
          )
        );
        
        showNotification('Cập nhật bài viết thành công!', 'success');
      } else {
        const error = await response.json();
        console.error('❌ Error updating post:', error);
        showNotification(error.error || 'Lỗi chỉnh sửa bài viết', 'error');
      }
    } catch (error) {
      console.error('❌ Error editing post:', error);
      showNotification('Lỗi chỉnh sửa bài viết', 'error');
    } finally {
      setLoading(false);
    }
  };

  const canEditPost = (post) => {
    // Chỉ cho phép chủ sở hữu bài viết chỉnh sửa
    if (!currentUser || !currentUser.id || !post || !post.user_id) {
      console.log('🔍 Debug canEditPost - Missing data:', {
        currentUser: currentUser,
        post: post,
        hasCurrentUser: !!currentUser,
        hasCurrentUserId: !!currentUser?.id,
        hasPost: !!post,
        hasPostUserId: !!post?.user_id
      });
      return false;
    }
    
    // Chuyển đổi cả hai về số để so sánh
    const currentUserId = parseInt(currentUser.id);
    const postUserId = parseInt(post.user_id);
    
    const canEdit = currentUserId === postUserId;
    
    console.log('🔍 Debug canEditPost:', {
      currentUser: currentUser,
      currentUserId: currentUserId,
      currentUserIdType: typeof currentUserId,
      postUserId: postUserId,
      postUserIdType: typeof postUserId,
      postId: post.id,
      post: post,
      canEdit: canEdit
    });
    
    return canEdit;
  };

  // Reaction functions
  const fetchReactionDetails = async (postId) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_ENDPOINTS.COMMUNITY_REACTIONS(postId)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        return data;
      }
    } catch (error) {
      console.error('Error fetching reaction details:', error);
    }
    return { reactions: [], stats: {} };
  };

  const openReactionModal = async (postId) => {
    const data = await fetchReactionDetails(postId);
    setSelectedPostReactions(data.reactions || []);
    setReactionStats(data.stats || {});
    setShowReactionModal(true);
  };

  const handleReaction = async (postId, reactionType) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        console.log('No access token found for reaction');
        return;
      }

      console.log(`Handling reaction for post ${postId}: ${reactionType || 'remove'}`);

      // Get current post to check existing reaction
      const currentPost = posts.find(post => post.id === postId);
      const hadReaction = currentPost?.userReaction;
      const isNewReaction = !hadReaction && reactionType;
      const isRemovingReaction = hadReaction && !reactionType;
      const isChangingReaction = hadReaction && reactionType && hadReaction !== reactionType;

      // Optimistically update userReaction
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post.id === postId 
            ? { 
                ...post, 
                userReaction: reactionType
              }
            : post
        )
      );

      if (reactionType) {
        // Add reaction
        const response = await fetch(`${API_ENDPOINTS.COMMUNITY_REACTIONS(postId)}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ type: reactionType })
        });

        console.log('Add reaction response status:', response.status);
        
        if (response.ok) {
          const result = await response.json();
          console.log('Reaction added:', result);
          
          // Update count based on reaction type
          setPosts(prevPosts => 
            prevPosts.map(post => 
              post.id === postId 
                ? { 
                    ...post, 
                    reaction_count: isNewReaction ? 
                      (post.reaction_count || 0) + 1 : 
                      (isChangingReaction ? post.reaction_count : post.reaction_count) // No change if changing reaction type
                  }
                : post
            )
          );
        } else {
          const errorText = await response.text();
          console.error('Failed to add reaction:', response.status, errorText);
          // Revert optimistic update on error
          setPosts(prevPosts => 
            prevPosts.map(post => 
              post.id === postId 
                ? { 
                    ...post, 
                    userReaction: hadReaction // Revert to previous state
                  }
                : post
            )
          );
        }
      } else {
        // Remove reaction
        const response = await fetch(`${API_ENDPOINTS.COMMUNITY_REACTIONS(postId)}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        console.log('Remove reaction response status:', response.status);
        
        if (response.ok) {
          const result = await response.json();
          console.log('Reaction removed:', result);
          
          // Update count only if removing reaction
          setPosts(prevPosts => 
            prevPosts.map(post => 
              post.id === postId 
                ? { 
                    ...post, 
                    reaction_count: isRemovingReaction ? 
                      Math.max(0, (post.reaction_count || 1) - 1) : 
                      post.reaction_count
                  }
                : post
            )
          );
        } else {
          const errorText = await response.text();
          console.error('Failed to remove reaction:', response.status, errorText);
          // Revert optimistic update on error
          setPosts(prevPosts => 
            prevPosts.map(post => 
              post.id === postId 
                ? { 
                    ...post, 
                    userReaction: hadReaction // Revert to previous state
                  }
                : post
            )
          );
        }
      }
    } catch (error) {
      console.error('Error handling reaction:', error);
      // Revert optimistic update on error
      const currentPost = posts.find(post => post.id === postId);
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post.id === postId 
            ? { 
                ...post, 
                userReaction: currentPost?.userReaction // Revert to previous state
              }
            : post
        )
      );
    }
  };

  // Comment functions
  const toggleComments = (postId) => {
    setPosts(posts.map(post => 
      post.id === postId 
        ? { ...post, showComments: !post.showComments }
        : post
    ));
  };

  const handleCommentChange = (postId, value) => {
    setPosts(posts.map(post => 
      post.id === postId 
        ? { ...post, newComment: value }
        : post
    ));
  };

  const handleAddComment = async (postId) => {
    try {
      const post = posts.find(p => p.id === postId);
      if (!post || !post.newComment?.trim()) {
        console.log('No comment content to add');
        return;
      }

      const token = localStorage.getItem('accessToken');
      if (!token) {
        console.log('No access token found for comment');
        return;
      }

      const commentContent = post.newComment.trim();
      console.log(`Adding comment to post ${postId}: ${commentContent}`);

      // Optimistically update the UI first - ONLY modify comments
      const tempId = `temp_${Date.now()}_${Math.random()}`;
      const newComment = {
        id: tempId,
        post_id: postId,
        user_id: currentUser?.id,
        content: commentContent,
        created_at: new Date().toISOString(),
        author_name: currentUser?.name || 'You'
      };

      // Update posts state - ONLY modify comments, preserve everything else
      setPosts(prevPosts => 
        prevPosts.map(p => 
          p.id === postId 
            ? { 
                ...p, 
                comments: [...(p.comments || []), newComment],
                newComment: ''
              }
            : p
        )
      );

      const response = await fetch(`${API_ENDPOINTS.COMMUNITY_COMMENTS(postId)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: commentContent })
      });

      console.log('Add comment response status:', response.status);

              if (response.ok) {
          const result = await response.json();
          console.log('Comment added:', result);
          
          // Update the comment with the real one from backend and update count
          setPosts(prevPosts => 
            prevPosts.map(p => 
              p.id === postId 
                ? { 
                    ...p, 
                    comments: p.comments.map(c => 
                      c.id === tempId ? result : c
                    ),
                    comment_count: p.comments.length // Use actual comments array length
                  }
                : p
            )
          );
        } else {
        const errorText = await response.text();
        console.error('Failed to add comment:', response.status, errorText);
        // Revert optimistic update on error
        fetchPosts();
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      // Revert optimistic update on error
      fetchPosts();
    }
  };

  const handleEditComment = async (postId, commentId, newContent) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        console.log('No access token found for editing comment');
        return;
      }

      console.log(`Editing comment ${commentId} in post ${postId}: ${newContent}`);

      // Optimistically update the UI first
      setPosts(prevPosts => 
        prevPosts.map(p => 
          p.id === postId 
            ? { 
                ...p, 
                comments: p.comments.map(c => 
                  c.id === commentId 
                    ? { ...c, content: newContent, isEditing: false }
                    : c
                )
              }
            : p
        )
      );

      const response = await fetch(`${API_ENDPOINTS.COMMUNITY_COMMENT_BY_ID(commentId)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: newContent })
      });

      console.log('Edit comment response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('Comment edited:', result);
        
        // Update with the real response from backend
        setPosts(prevPosts => 
          prevPosts.map(p => 
            p.id === postId 
              ? { 
                  ...p, 
                  comments: p.comments.map(c => 
                    c.id === commentId ? result : c
                  )
                }
              : p
          )
        );
      } else {
        const errorText = await response.text();
        console.error('Failed to edit comment:', response.status, errorText);
        // Revert optimistic update on error
        fetchPosts();
      }
    } catch (error) {
      console.error('Error editing comment:', error);
      // Revert optimistic update on error
      fetchPosts();
    }
  };

  const handleDeleteComment = async (postId, commentId) => {
    try {
      if (!window.confirm('Bạn có chắc muốn xóa bình luận này?')) {
        return;
      }

      const token = localStorage.getItem('accessToken');
      if (!token) {
        console.log('No access token found for deleting comment');
        return;
      }

      console.log(`Deleting comment ${commentId} from post ${postId}`);

      // Optimistically update the UI first
      setPosts(prevPosts => 
        prevPosts.map(p => 
          p.id === postId 
            ? { 
                ...p, 
                comments: p.comments.filter(c => c.id !== commentId),
                comment_count: Math.max(0, (p.comment_count || 0) - 1)
              }
            : p
        )
      );

      const response = await fetch(`${API_ENDPOINTS.COMMUNITY_COMMENT_BY_ID(commentId)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('Delete comment response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to delete comment:', response.status, errorText);
        // Revert optimistic update on error
        fetchPosts();
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      // Revert optimistic update on error
      fetchPosts();
    }
  };

  const toggleCommentEdit = (postId, commentId) => {
    setPosts(prevPosts => 
      prevPosts.map(p => 
        p.id === postId 
          ? { 
              ...p, 
              comments: p.comments.map(c => 
                c.id === commentId 
                  ? { 
                      ...c, 
                      isEditing: !c.isEditing,
                      editContent: !c.isEditing ? c.content : undefined // Khởi tạo editContent với nội dung hiện tại
                    }
                  : c
              )
            }
          : p
      )
    );
  };

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const postDate = new Date(dateString);
    const diffInSeconds = Math.floor((now - postDate) / 1000);
    
    if (diffInSeconds < 60) return 'Vừa xong';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} phút trước`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} giờ trước`;
    return `${Math.floor(diffInSeconds / 86400)} ngày trước`;
  };

  // Image modal functions
  const openImageModal = (imageUrl, fileName) => {
    setSelectedImage({ url: imageUrl, name: fileName });
    setShowImageModal(true);
  };

  const closeImageModal = () => {
    setSelectedImage(null);
    setShowImageModal(false);
  };

  const downloadImage = async (imageUrl, fileName) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading image:', error);
              showNotification('Lỗi tải ảnh', 'error');
    }
  };

    

  const removeFile = (index) => {
    const fileToRemove = previewFiles[index];
    console.log('🔍 Debug removeFile:', {
      index: index,
      fileToRemove: fileToRemove,
      isExisting: fileToRemove?.isExisting,
      previewFilesLength: previewFiles.length,
      selectedFilesLength: selectedFiles.length
    });
    
    if (fileToRemove.isExisting) {
      // Nếu là media cũ, chỉ xóa khỏi preview
      console.log(`🗑️  Xóa media cũ: ${fileToRemove.file_name}`);
      setPreviewFiles(prev => prev.filter((_, i) => i !== index));
    } else {
      // Nếu là file mới, xóa cả preview và selected files
      console.log(`🗑️  Xóa file mới: ${fileToRemove.name || fileToRemove.file?.name}`);
      
      // Tìm index tương ứng trong selectedFiles
      const selectedFileIndex = selectedFiles.findIndex(file => 
        file.name === (fileToRemove.name || fileToRemove.file?.name)
      );
      
      if (selectedFileIndex !== -1) {
        setSelectedFiles(prev => prev.filter((_, i) => i !== selectedFileIndex));
        console.log(`✅ Đã xóa file khỏi selectedFiles tại index ${selectedFileIndex}`);
      }
      
      setPreviewFiles(prev => {
        const newPreviews = prev.filter((_, i) => i !== index);
        // Revoke object URL to prevent memory leaks
        if (prev[index]?.preview && !prev[index]?.isExisting) {
          URL.revokeObjectURL(prev[index].preview);
          console.log(`✅ Đã revoke object URL cho file: ${prev[index].name || prev[index].file?.name}`);
        }
        return newPreviews;
      });
    }
    
    console.log('🔍 Debug removeFile - After removal:', {
      newPreviewFilesLength: previewFiles.length - 1,
      newSelectedFilesLength: selectedFiles.length - (fileToRemove.isExisting ? 0 : 1)
    });
  };

  return (
    <div className="community-section">
      <div className="section-header">
        <h2>🌟 Cộng đồng</h2>
        <button 
          className="btn-primary" 
          onClick={() => setShowCreateForm(true)}
        >
          Tạo bài viết mới
        </button>
      </div>

      {/* Create Post Form */}
      {showCreateForm && (
        <div className="modal-overlay" onClick={() => setShowCreateForm(false)}>
          <div className="modal community-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Tạo bài viết mới</h3>
              <button className="modal-close" onClick={() => setShowCreateForm(false)}>×</button>
            </div>
            <form onSubmit={handleCreatePost} className="modal-form">
              <div className="form-group">
                <label>Nội dung:</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                  placeholder="Bạn đang nghĩ gì?"
                  rows="6"
                  required
                />
              </div>
              
              
              
              <div className="form-group">
                <label>Thêm hình ảnh/video:</label>
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  className="file-input"
                />
                                 <small>Chọn hình ảnh hoặc video (tối đa 20MB mỗi file)</small>
              </div>
              
              {/* File Previews */}
              {previewFiles.length > 0 && (
                <div className="file-previews">
                  <h4>File đã chọn:</h4>
                  <div className="preview-grid">
                    {previewFiles.map((preview, index) => {
                      const fileName = preview.name || preview.file?.name;
                      const mediaUrl = preview.isExisting ? preview.preview : URL.createObjectURL(preview.file);
                      
                      return (
                        <div key={index} className={`file-preview ${preview.isExisting ? 'existing-media' : ''}`}>
                          {isImage(fileName) ? (
                            <img 
                              src={mediaUrl} 
                              alt="Preview" 
                              className="preview-img"
                              onError={(e) => {
                                console.error('Image load error:', e.target.src);
                                e.target.style.display = 'none';
                              }}
                            />
                          ) : isVideo(fileName) ? (
                            <video 
                              controls
                              preload="metadata"
                              className="preview-video"
                              onError={(e) => {
                                console.error('Video load error:', e.target.src);
                              }}
                            >
                              <source src={mediaUrl} type={preview.file?.type || 'video/mp4'} />
                              Your browser does not support the video tag.
                            </video>
                          ) : (
                            <div className="unknown-file">
                              <span>📄</span>
                              <p>Unknown file type</p>
                            </div>
                          )}
                          <button 
                            type="button" 
                            className="remove-file-btn"
                            onClick={() => removeFile(index)}
                          >
                            ×
                          </button>
                          <span className="file-name">{fileName}</span>
                          {preview.isExisting && (
                            <small className="existing-label">(Media hiện tại)</small>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              <div className="form-actions">
                <button type="button" onClick={() => setShowCreateForm(false)} className="btn-secondary">
                  Hủy
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Đang tạo...' : 'Đăng bài'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Post Form */}
      {showEditForm && editingPost && (
        <div className="modal-overlay" onClick={() => setShowEditForm(false)}>
          <div className="modal community-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Chỉnh sửa bài viết</h3>
              <button className="modal-close" onClick={() => setShowEditForm(false)}>×</button>
            </div>
            <form onSubmit={handleEditPost} className="modal-form">
              <div className="form-group">
                <label>Nội dung:</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                  placeholder="Bạn đang nghĩ gì?"
                  rows="6"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Thêm hình ảnh/video mới:</label>
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  className="file-input"
                />
                <small>Chọn hình ảnh hoặc video (tối đa 20MB mỗi file)</small>
              </div>
              
              {/* File Previews - Hiển thị tất cả media (cũ và mới) */}
              {previewFiles.length > 0 && (
                <div className="file-previews">
                  <h4>Media của bài viết:</h4>
                  <div className="preview-grid">
                    {previewFiles.map((preview, index) => {
                      const fileName = preview.name || preview.file?.name;
                      const mediaUrl = preview.isExisting ? preview.preview : URL.createObjectURL(preview.file);
                      
                      return (
                        <div key={index} className={`file-preview ${preview.isExisting ? 'existing-media' : ''}`}>
                          {isImage(fileName) ? (
                            <img 
                              src={mediaUrl} 
                              alt="Preview" 
                              className="preview-img"
                              onError={(e) => {
                                console.error('Image load error:', e.target.src);
                                e.target.style.display = 'none';
                              }}
                              onLoad={() => console.log('Image loaded successfully:', fileName)}
                            />
                          ) : isVideo(fileName) ? (
                            <video 
                              controls
                              preload="metadata"
                              className="preview-video"
                              onError={(e) => {
                                console.error('Video load error:', e.target.src);
                              }}
                            >
                              <source src={mediaUrl} type={preview.file?.type || 'video/mp4'} />
                              Your browser does not support the video tag.
                            </video>
                          ) : (
                            <div className="unknown-file">
                              <span>📄</span>
                              <p>Unknown file type</p>
                            </div>
                          )}
                          <button 
                            type="button" 
                            className="remove-file-btn"
                            onClick={() => removeFile(index)}
                          >
                            ×
                          </button>
                          <span className="file-name">{fileName}</span>
                          {preview.isExisting && (
                            <small className="existing-label">(Media hiện tại)</small>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              <div className="form-actions">
                <button type="button" onClick={() => setShowEditForm(false)} className="btn-secondary">
                  Hủy
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Đang cập nhật...' : 'Cập nhật bài viết'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Posts List */}
      <div className="posts-list">
        {posts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📝</div>
            <h3>Chưa có bài viết nào</h3>
            <p>Hãy là người đầu tiên chia sẻ điều gì đó với cộng đồng!</p>
            <button 
              className="btn-primary" 
              onClick={() => setShowCreateForm(true)}
            >
              Tạo bài viết đầu tiên
            </button>
          </div>
        ) : (
          posts.map(post => (
            <div key={post.id} className="post-card">
              <div className="post-header">
                <div className="post-author">
                  <div className="author-avatar">
                    {post.author_avatar ? (
                      <img 
                        src={post.author_avatar} 
                        alt={post.author_name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div style={{ display: post.author_avatar ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                      {post.author_name ? post.author_name.charAt(0).toUpperCase() : 'U'}
                    </div>
                  </div>
                  <div className="author-info">
                    <h4 
                      className="author-name" 
                      style={{ cursor: 'pointer' }}
                      onClick={() => onUserClick && onUserClick(post.user_id)}
                    >
                      {post.author_name || 'Người dùng'}
                    </h4>
                                         <div className="post-meta">
                       <span className="post-time">{formatTimeAgo(post.created_at)}</span>
                     </div>
                  </div>
                </div>
                <div className="post-actions">
                  {canEditPost(post) && (
                    <>
                      <button 
                        className="btn-edit" 
                        onClick={() => openEditForm(post)}
                        title="Chỉnh sửa bài viết"
                      >
                        ✏️
                      </button>
                      <button 
                        className="btn-delete" 
                        onClick={() => handleDeletePost(post.id)}
                        title="Xóa bài viết"
                      >
                        🗑️
                      </button>
                    </>
                  )}
                </div>
              </div>
              
              <div className="post-content">
                <p>{post.content}</p>
              </div>
              
              {/* Post Media */}
              {post.media && post.media.length > 0 && post.media[0] !== null && (
                <div className="post-media">
                  {post.media.map((media, index) => (
                    <div key={media.id || index} className="media-item">
                      {media.file_type === 'image' ? (
                        <img 
                          src={`${API_ENDPOINTS.COMMUNITY_UPLOADS}/${encodeURIComponent(media.file_name)}?t=${Date.now()}`} 
                          alt={media.file_name}
                          className="post-image"
                          crossOrigin="anonymous"
                          onClick={() => openImageModal(`${API_ENDPOINTS.COMMUNITY_UPLOADS}/${encodeURIComponent(media.file_name)}?t=${Date.now()}`, media.file_name)}
                          style={{ cursor: 'pointer' }}
                          onError={(e) => {
                            console.error('Image load error:', e.target.src);
                            e.target.style.display = 'none';
                          }}
                          onLoad={() => console.log('Image loaded successfully:', media.file_name)}
                        />
                      ) : (
                        <video 
                          controls 
                          className="post-video"
                          preload="metadata"
                          crossOrigin="anonymous"
                          onError={(e) => {
                            console.error('Video load error:', e.target.src);
                          }}
                          onLoadStart={() => console.log('Video loading started:', media.file_name)}
                          onCanPlay={() => console.log('Video can play:', media.file_name)}
                        >
                                                  <source src={`${API_ENDPOINTS.COMMUNITY_UPLOADS}/${encodeURIComponent(media.file_name)}?t=${Date.now()}`} type="video/mp4" />
                        <source src={`${API_ENDPOINTS.COMMUNITY_UPLOADS}/${encodeURIComponent(media.file_name)}?t=${Date.now()}`} type="video/webm" />
                        <source src={`${API_ENDPOINTS.COMMUNITY_UPLOADS}/${encodeURIComponent(media.file_name)}?t=${Date.now()}`} type="video/ogg" />
                          Your browser does not support the video tag.
                        </video>
                      )}
                      {post.media.length > 3 && index === 2 && (
                        <div className="media-overlay">
                          +{post.media.length - 3}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              <div className="post-footer">
                <div className="post-actions-bar">
                  <div className="reaction-section">
                    <button 
                      className={`action-btn like-btn ${post.userReaction ? 'active' : ''}`}
                      onClick={() => handleReaction(post.id, post.userReaction ? null : 'like')}
                    >
                      <span className="action-icon">
                        {post.userReaction === 'like' ? '👍' : 
                         post.userReaction === 'love' ? '❤️' : 
                         post.userReaction === 'haha' ? '😂' : 
                         post.userReaction === 'wow' ? '😮' : 
                         post.userReaction === 'sad' ? '😢' : 
                         post.userReaction === 'angry' ? '😠' : '👍'}
                      </span>
                      <span className="action-text">
                        {post.userReaction === 'like' ? 'Thích' : 
                         post.userReaction === 'love' ? 'Yêu thích' : 
                         post.userReaction === 'haha' ? 'Haha' : 
                         post.userReaction === 'wow' ? 'Wow' : 
                         post.userReaction === 'sad' ? 'Buồn' : 
                         post.userReaction === 'angry' ? 'Giận' : 'Thích'}
                      </span>
                    </button>
                    <div className="reaction-options">
                      <button onClick={() => handleReaction(post.id, 'like')} title="Thích">👍</button>
                      <button onClick={() => handleReaction(post.id, 'love')} title="Yêu thích">❤️</button>
                      <button onClick={() => handleReaction(post.id, 'haha')} title="Haha">😂</button>
                      <button onClick={() => handleReaction(post.id, 'wow')} title="Wow">😮</button>
                      <button onClick={() => handleReaction(post.id, 'sad')} title="Buồn">😢</button>
                      <button onClick={() => handleReaction(post.id, 'angry')} title="Giận">😠</button>
                    </div>
                  </div>
                  <button 
                    className="action-btn comment-btn"
                    onClick={() => toggleComments(post.id)}
                  >
                    <span className="action-icon">💬</span>
                    <span className="action-text">Bình luận</span>
                  </button>
                </div>
                
                {/* Reaction and Comment Count */}
                {(post.reaction_count > 0 || post.comment_count > 0) && (
                  <div className="post-stats">
                    {post.reaction_count > 0 && (
                      <div 
                        className="reaction-count clickable"
                        onClick={() => openReactionModal(post.id)}
                        title="Xem ai đã thích"
                      >
                        <span className="reaction-icons">
                          {post.userReaction === 'like' ? '👍' : 
                           post.userReaction === 'love' ? '❤️' : 
                           post.userReaction === 'haha' ? '😂' : 
                           post.userReaction === 'wow' ? '😮' : 
                           post.userReaction === 'sad' ? '😢' : 
                           post.userReaction === 'angry' ? '😠' : '👍'}
                        </span>
                        <span className="count-text">{post.reaction_count}</span>
                      </div>
                    )}
                    {post.comment_count > 0 && (
                      <div className="comment-count">
                        <span className="count-text">{post.comment_count} bình luận</span>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Comments Section */}
                {post.showComments && (
                  <div className="comments-section">
                    <div className="comments-list">
                      {post.comments && post.comments.map((comment, index) => (
                        <div key={comment.id || index} className="comment-item">
                          <div className="comment-header">
                            <div className="comment-author">{comment.author_name}</div>
                            <div className="comment-time">{formatTimeAgo(comment.created_at)}</div>
                            {comment.user_id === currentUser?.id && (
                              <div className="comment-actions">
                                <button 
                                  className="btn-edit"
                                  onClick={() => toggleCommentEdit(post.id, comment.id)}
                                  title="Chỉnh sửa"
                                >
                                  ✏️
                                </button>
                                <button 
                                  className="btn-delete"
                                  onClick={() => handleDeleteComment(post.id, comment.id)}
                                  title="Xóa"
                                >
                                  🗑️
                                </button>
                              </div>
                            )}
                          </div>
                          {comment.isEditing ? (
                            <div className="comment-edit-form">
                              <input
                                type="text"
                                value={comment.editContent !== undefined ? comment.editContent : comment.content}
                                onChange={(e) => {
                                  setPosts(prevPosts => 
                                    prevPosts.map(p => 
                                      p.id === post.id 
                                        ? { 
                                            ...p, 
                                            comments: p.comments.map(c => 
                                              c.id === comment.id 
                                                ? { ...c, editContent: e.target.value }
                                                : c
                                            )
                                          }
                                        : p
                                    )
                                  );
                                }}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    handleEditComment(post.id, comment.id, comment.editContent !== undefined ? comment.editContent : comment.content);
                                  }
                                }}
                                autoFocus
                              />
                              <div className="edit-actions">
                                <button 
                                  className="btn-save"
                                  onClick={() => handleEditComment(post.id, comment.id, comment.editContent !== undefined ? comment.editContent : comment.content)}
                                >
                                  💾
                                </button>
                                <button 
                                  className="btn-cancel"
                                  onClick={() => toggleCommentEdit(post.id, comment.id)}
                                >
                                  ❌
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="comment-content">{comment.content}</div>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="comment-form">
                      <input
                        type="text"
                        placeholder="Viết bình luận..."
                        value={post.newComment || ''}
                        onChange={(e) => handleCommentChange(post.id, e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddComment(post.id)}
                      />
                      <button onClick={() => handleAddComment(post.id)}>Gửi</button>
                    </div>
                  </div>
                )}

              </div>
            </div>
          ))
        )}
      </div>

      {/* Image Modal */}
      {showImageModal && selectedImage && (
        <div className="modal-overlay" onClick={closeImageModal}>
          <div className="image-modal" onClick={(e) => e.stopPropagation()}>
            <div className="image-modal-header">
              <h3>{selectedImage.name}</h3>
              <div className="image-modal-actions">
                <button 
                  className="btn-secondary"
                  onClick={() => downloadImage(selectedImage.url, selectedImage.name)}
                >
                  📥 Tải về
                </button>
                <button className="modal-close" onClick={closeImageModal}>×</button>
              </div>
            </div>
            <div className="image-modal-content">
              <img 
                src={selectedImage.url} 
                alt={selectedImage.name}
                className="modal-image"
                crossOrigin="anonymous"
              />
            </div>
          </div>
        </div>
      )}

      {/* Reaction Details Modal */}
      {showReactionModal && (
        <div className="modal-overlay" onClick={() => setShowReactionModal(false)}>
          <div className="reaction-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Phản ứng</h3>
              <button className="modal-close" onClick={() => setShowReactionModal(false)}>×</button>
            </div>
            
            <div className="reaction-stats">
              <div className="total-reactions">
                <span>Tất cả {Object.values(reactionStats).reduce((a, b) => a + b, 0)}</span>
              </div>
              <div className="reaction-breakdown">
                {reactionStats.like > 0 && (
                  <div className="reaction-type">
                    <span className="reaction-icon">👍</span>
                    <span className="reaction-count">{reactionStats.like}</span>
                  </div>
                )}
                {reactionStats.love > 0 && (
                  <div className="reaction-type">
                    <span className="reaction-icon">❤️</span>
                    <span className="reaction-count">{reactionStats.love}</span>
                  </div>
                )}
                {reactionStats.haha > 0 && (
                  <div className="reaction-type">
                    <span className="reaction-icon">😂</span>
                    <span className="reaction-count">{reactionStats.haha}</span>
                  </div>
                )}
                {reactionStats.wow > 0 && (
                  <div className="reaction-type">
                    <span className="reaction-icon">😮</span>
                    <span className="reaction-count">{reactionStats.wow}</span>
                  </div>
                )}
                {reactionStats.sad > 0 && (
                  <div className="reaction-type">
                    <span className="reaction-icon">😢</span>
                    <span className="reaction-count">{reactionStats.sad}</span>
                  </div>
                )}
                {reactionStats.angry > 0 && (
                  <div className="reaction-type">
                    <span className="reaction-icon">😠</span>
                    <span className="reaction-count">{reactionStats.angry}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="reaction-users">
              {selectedPostReactions.map((reaction, index) => (
                <div key={reaction.id || index} className="reaction-user">
                  <div className="user-avatar">
                    {reaction.user_avatar ? (
                      <img 
                        src={reaction.user_avatar} 
                        alt={reaction.user_name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div style={{ display: reaction.user_avatar ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                      {reaction.user_name ? reaction.user_name.charAt(0).toUpperCase() : 'U'}
                    </div>
                  </div>
                  <div className="user-info">
                    <div className="user-name">{reaction.user_name}</div>
                    <div className="user-reaction">
                      <span className="reaction-icon">
                        {reaction.type === 'like' ? '👍' : 
                         reaction.type === 'love' ? '❤️' : 
                         reaction.type === 'haha' ? '😂' : 
                         reaction.type === 'wow' ? '😮' : 
                         reaction.type === 'sad' ? '😢' : 
                         reaction.type === 'angry' ? '😠' : '👍'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ProfileComponent = ({ userId, onClose, setUser, currentUser, showNotification }) => {
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    gender: '',
    date_of_birth: '',
    phone: '',
    email: '',
    address: '',
    subject: '',
    education_level: '',
    current_class: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchProfile();
    }
  }, [userId]);

  // Fetch profile whenever modal is opened
  useEffect(() => {
    if (userId && !loading) {
      fetchProfile();
    }
  }, []);

  const fetchProfile = async () => {
    try {
      // Kiểm tra xem có phải profile của chính mình không
      const currentUserId = currentUser?.id;
      if (userId !== currentUserId) {
        console.error('User can only view their own profile');
        return;
      }

      const response = await fetch(API_ENDPOINTS.PROFILE_ME, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        setProfile(result.data);
        setFormData({
          first_name: result.data.first_name || '',
          last_name: result.data.last_name || '',
          gender: result.data.gender || '',
          date_of_birth: result.data.date_of_birth || '',
          phone: result.data.phone || '',
          email: result.data.email || '',
          address: result.data.address || '',
          subject: result.data.subject || '',
          education_level: result.data.education_level || '',
          current_class: result.data.current_class || ''
        });
      } else if (response.status === 404) {
        // Profile chưa tồn tại, tạo mới
        setProfile(null);
        setFormData({
          first_name: '',
          last_name: '',
          gender: '',
          date_of_birth: '',
          phone: '',
          email: '',
          address: '',
          subject: '',
          education_level: '',
          current_class: ''
        });
      } else {
        console.error('Failed to fetch profile');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showNotification('Mật khẩu nhập lại không khớp', 'error');
      return;
    }
    
    if (passwordData.newPassword.length < 4) {
      showNotification('Mật khẩu mới phải có ít nhất 4 ký tự', 'error');
      return;
    }
    
    setChangingPassword(true);
    
    try {
      console.log('Changing password for user:', currentUser?.id);
      console.log('Token:', localStorage.getItem('accessToken'));
      
              const response = await fetch(API_ENDPOINTS.AUTH_CHANGE_PASSWORD, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });
      
      console.log('Change password response status:', response.status);
      const result = await response.json();
      console.log('Change password response:', result);
      
      if (response.ok && result.success) {
        showNotification('Đổi mật khẩu thành công!', 'success');
        setShowChangePassword(false);
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        showNotification(result.message || 'Đổi mật khẩu thất bại', 'error');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      showNotification('Lỗi đổi mật khẩu', 'error');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const formDataToSend = new FormData();
      
      // Xử lý format ngày trước khi gửi
      const processedData = { ...formData };
      if (processedData.date_of_birth) {
        // Chuyển dd/mm/yyyy thành yyyy-mm-dd cho database
        const dateParts = processedData.date_of_birth.split('/');
        if (dateParts.length === 3) {
          const day = dateParts[0].padStart(2, '0');
          const month = dateParts[1].padStart(2, '0');
          const year = dateParts[2];
          processedData.date_of_birth = `${year}-${month}-${day}`;
        }
      }
      
      // Thêm thông tin profile
      Object.keys(processedData).forEach(key => {
        if (processedData[key] !== undefined && processedData[key] !== null && processedData[key] !== '') {
          formDataToSend.append(key, processedData[key]);
        }
      });
      
      // Thêm avatar nếu có
      if (avatarFile) {
        formDataToSend.append('avatar', avatarFile);
      }
      
      console.log('Sending profile data:', processedData);
              console.log('Request URL:', API_ENDPOINTS.PROFILE);
      console.log('Request headers:', {
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
      });
      
      // Test connection to teacher service first
      try {
        const testResponse = await fetch(API_ENDPOINTS.TEACHER_HEALTH, {
          method: 'GET'
        });
        console.log('Teacher service health check:', testResponse.status);
      } catch (testError) {
        console.error('Teacher service health check failed:', testError);
      }
      
      // Debug FormData
      console.log('FormData contents:');
      for (let [key, value] of formDataToSend.entries()) {
        console.log(`${key}:`, value);
      }
      
      let response;
      try {
        response = await fetch(API_ENDPOINTS.PROFILE, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            // Không set Content-Type cho FormData, để browser tự động set
          },
          body: formDataToSend
        });
        
        console.log('Profile update response status:', response.status);
        console.log('Profile update response headers:', response.headers);
        
        if (response.ok) {
          const result = await response.json();
          console.log('Profile update success:', result);
          
          // Cập nhật profile ngay lập tức
          setProfile(result.data);
          setIsEditing(false);
          setAvatarFile(null);
          
          // Cập nhật thông tin user trong header
          if (currentUser && currentUser.id === userId) {
            setUser(prevUser => ({
              ...prevUser,
              first_name: result.data.first_name,
              last_name: result.data.last_name,
              email: result.data.email,
              gender: result.data.gender
            }));
          }
          
          showNotification('Cập nhật profile thành công!', 'success');
        } else {
          const errorText = await response.text();
          console.error('Profile update error:', errorText);
                      showNotification('Lỗi cập nhật profile: ' + errorText, 'error');
        }
      } catch (fetchError) {
        console.error('Fetch error:', fetchError);
                    showNotification('Lỗi cập nhật profile: ' + fetchError.message, 'error');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
              showNotification('Lỗi cập nhật profile: ' + error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="profile-modal">
        <div className="profile-content">
          <div className="loading">Đang tải...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-modal">
      <div className="profile-content">
                      <div className="profile-header">
                <h2>Hồ sơ cá nhân</h2>
                <button className="close-btn" onClick={onClose}>×</button>
              </div>
        
        {!isEditing ? (
          <div className="profile-info">
            {profile ? (
              <>
                <div className="avatar-section">
                  <div className="avatar">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="Avatar" />
                    ) : (
                      <div className="avatar-placeholder">
                        {profile?.first_name?.[0] || 'U'}
                      </div>
                    )}
                  </div>
                  <div className="avatar-actions">
                    <button 
                      className="edit-btn"
                      onClick={() => setIsEditing(true)}
                    >
                      ✏️ Chỉnh sửa
                    </button>
                    <button 
                      className="change-password-btn"
                      onClick={() => setShowChangePassword(true)}
                    >
                      🔒 Đổi mật khẩu
                    </button>
                  </div>
                </div>
                
                <div className="info-grid">
                  <div className="info-item">
                    <label>Họ tên:</label>
                    <span>{profile?.first_name} {profile?.last_name}</span>
                  </div>
                  <div className="info-item">
                    <label>Giới tính:</label>
                    <span>{profile?.gender || 'Chưa cập nhật'}</span>
                  </div>
                  <div className="info-item">
                    <label>Ngày sinh:</label>
                    <span>{profile?.date_of_birth ? formatDate(profile.date_of_birth) : 'Chưa cập nhật'}</span>
                  </div>
                  <div className="info-item">
                    <label>Số điện thoại:</label>
                    <span>{profile?.phone || 'Chưa cập nhật'}</span>
                  </div>
                  <div className="info-item">
                    <label>Mail:</label>
                    <span>{profile?.email || 'Chưa cập nhật'}</span>
                  </div>
                  <div className="info-item">
                    <label>Địa chỉ:</label>
                    <span>{profile?.address || 'Chưa cập nhật'}</span>
                  </div>
                  <div className="info-item">
                    <label>Môn giảng dạy:</label>
                    <span>{profile?.subject || 'Chưa cập nhật'}</span>
                  </div>
                  <div className="info-item">
                    <label>Trình độ:</label>
                    <span>{profile?.education_level || 'Chưa cập nhật'}</span>
                  </div>
                  <div className="info-item">
                    <label>Lớp chủ nhiệm hiện tại:</label>
                    <span>{profile?.current_class || 'Chưa cập nhật'}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="create-profile">
                <div className="avatar-section">
                  <div className="avatar-placeholder">U</div>
                  <button 
                    className="edit-btn"
                    onClick={() => setIsEditing(true)}
                  >
                    ✏️ Chỉnh sửa
                  </button>
                </div>
                <div className="info-grid">
                  <div className="info-item">
                    <label>Họ tên:</label>
                    <span>Chưa có hồ sơ</span>
                  </div>
                  <div className="info-item">
                    <label>Giới tính:</label>
                    <span>Chưa có hồ sơ</span>
                  </div>
                  <div className="info-item">
                    <label>Ngày sinh:</label>
                    <span>Chưa có hồ sơ</span>
                  </div>
                  <div className="info-item">
                    <label>Số điện thoại:</label>
                    <span>Chưa có hồ sơ</span>
                  </div>
                  <div className="info-item">
                    <label>Mail:</label>
                    <span>Chưa có hồ sơ</span>
                  </div>
                  <div className="info-item">
                    <label>Địa chỉ:</label>
                    <span>Chưa có hồ sơ</span>
                  </div>
                  <div className="info-item">
                    <label>Môn giảng dạy:</label>
                    <span>Chưa có hồ sơ</span>
                  </div>
                  <div className="info-item">
                    <label>Trình độ:</label>
                    <span>Chưa có hồ sơ</span>
                  </div>
                  <div className="info-item">
                    <label>Lớp chủ nhiệm hiện tại:</label>
                    <span>Chưa có hồ sơ</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSave} className="profile-form">
            <div className="form-grid">
              <div className="form-group">
                <label>Họ:</label>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Tên:</label>
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Giới tính:</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({...formData, gender: e.target.value})}
                >
                  <option value="">Chọn giới tính</option>
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                </select>
              </div>
              <div className="form-group">
                <label>Ngày sinh:</label>
                <input
                  type="text"
                  placeholder="dd/mm/yyyy"
                  value={formData.date_of_birth}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Chỉ cho phép nhập số và dấu /
                    let cleaned = value.replace(/[^0-9/]/g, '');
                    
                    // Kiểm tra format dd/mm/yyyy
                    const dateRegex = /^(\d{0,2})(\/?)(\d{0,2})(\/?)(\d{0,4})$/;
                    const match = cleaned.match(dateRegex);
                    
                    if (match) {
                      let day = match[1] || '';
                      let month = match[3] || '';
                      let year = match[5] || '';
                      
                      // Tự động thêm dấu /
                      if (day.length === 2 && month.length === 0) {
                        cleaned = day + '/';
                      } else if (day.length === 2 && month.length === 2 && year.length === 0) {
                        cleaned = day + '/' + month + '/';
                      } else if (day.length === 2 && month.length === 2 && year.length > 0) {
                        cleaned = day + '/' + month + '/' + year;
                      }
                      
                      // Giới hạn độ dài tối đa (dd/mm/yyyy = 10 ký tự)
                      if (cleaned.length <= 10) {
                        setFormData({...formData, date_of_birth: cleaned});
                      }
                    }
                  }}
                />
              </div>
              <div className="form-group">
                <label>Số điện thoại:</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Mail:</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="Nhập email của bạn"
                  required
                />
              </div>
              <div className="form-group full-width">
                <label>Địa chỉ:</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Môn giảng dạy:</label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({...formData, subject: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Trình độ:</label>
                <input
                  type="text"
                  value={formData.education_level}
                  onChange={(e) => setFormData({...formData, education_level: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Lớp chủ nhiệm hiện tại:</label>
                <input
                  type="text"
                  value={formData.current_class}
                  onChange={(e) => setFormData({...formData, current_class: e.target.value})}
                />
              </div>
              <div className="form-group full-width">
                <label>Ảnh đại diện:</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="file-input"
                />
                <small>Chọn ảnh từ máy tính hoặc điện thoại</small>
              </div>
            </div>
            
            <div className="form-actions">
              <button type="button" onClick={() => setIsEditing(false)}>
                Hủy
              </button>
              <button type="submit" disabled={saving}>
                {saving ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </form>
        )}

        {/* Change Password Modal */}
        {showChangePassword && (
          <div className="change-password-modal">
            <div className="change-password-content">
              <div className="change-password-header">
                <h3>Đổi mật khẩu</h3>
                <button 
                  className="close-btn" 
                  onClick={() => {
                    setShowChangePassword(false);
                    setPasswordData({
                      currentPassword: '',
                      newPassword: '',
                      confirmPassword: ''
                    });
                  }}
                >
                  ×
                </button>
              </div>
              
              <form onSubmit={handleChangePassword} className="change-password-form">
                <div className="form-group">
                  <label>Mật khẩu hiện tại:</label>
                  <input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                    placeholder="Nhập mật khẩu hiện tại"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Mật khẩu mới:</label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                    placeholder="Nhập mật khẩu mới"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Nhập lại mật khẩu mới:</label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                    placeholder="Nhập lại mật khẩu mới"
                    required
                  />
                </div>
                
                <div className="form-actions">
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowChangePassword(false);
                      setPasswordData({
                        currentPassword: '',
                        newPassword: '',
                        confirmPassword: ''
                      });
                    }}
                  >
                    Hủy
                  </button>
                  <button type="submit" disabled={changingPassword}>
                    {changingPassword ? 'Đang đổi...' : 'Đổi mật khẩu'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Main App Component
function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [authMode, setAuthMode] = useState('login');
  const [authData, setAuthData] = useState({
    email: '',
    password: '',
    name: ''
  });
  const [forgotEmail, setForgotEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPasswordPopup, setShowPasswordPopup] = useState(false);

  // Calendar state - always initialize these
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);

  // Calendar day click modal
  const [showDayModal, setShowDayModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedDayEvents, setSelectedDayEvents] = useState([]);
  
  // Profile modal
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  
  // Reaction details modal
  const [showReactionModal, setShowReactionModal] = useState(false);
  const [selectedPostReactions, setSelectedPostReactions] = useState([]);
  const [reactionStats, setReactionStats] = useState({});
    const [notification, setNotification] = useState({ show: false, message: '', type: 'info' });
  
  const showNotification = (message, type = 'info') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: 'info' }), 3000);
  };
    
    // Calendar data
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [calendarDiaries, setCalendarDiaries] = useState([]);
  
  // Real-time dashboard data
  const [todayActivities, setTodayActivities] = useState(0);
  const [recentDiaries, setRecentDiaries] = useState(0);
  const [newPosts, setNewPosts] = useState(0);
  
  // Daily motivation quote
  const [dailyQuote, setDailyQuote] = useState('');
  const [quoteLoading, setQuoteLoading] = useState(false);

  // Function to get event color
  const getEventColor = (color) => {
    switch (color) {
      case 'blue': return '#3B82F6';
      case 'green': return '#10B981';
      case 'orange': return '#F59E0B';
      case 'red': return '#EF4444';
      default: return '#3B82F6';
    }
  };

  // Function to get daily motivation quote
  const fetchDailyQuote = async () => {
    try {
      setQuoteLoading(true);
      
      // Tạo seed dựa trên ngày và user ID để đảm bảo mỗi ngày mỗi user có câu nói khác nhau
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const userId = user?.id || 1;
      const seed = `${today}-${userId}`;
      
      // Danh sách câu nói động viên cho giáo viên
      const quotes = [
        "Hôm nay là một ngày tuyệt vời để truyền cảm hứng cho học sinh! 🌟",
        "Mỗi bài giảng là một cơ hội để thay đổi cuộc đời một đứa trẻ! 📚",
        "Kiến thức là ánh sáng, và bạn là người thắp sáng tương lai! ✨",
        "Sự kiên nhẫn hôm nay sẽ tạo ra những thành công ngày mai! 🌱",
        "Mỗi học sinh đều có tiềm năng vô hạn, hãy giúp họ khám phá! 🚀",
        "Giáo dục không chỉ là dạy kiến thức, mà còn là nuôi dưỡng ước mơ! 💫",
        "Hôm nay bạn sẽ tạo ra sự khác biệt trong cuộc đời ai đó! 🌈",
        "Sự tận tâm của bạn hôm nay sẽ định hình tương lai của nhiều người! 🎯",
        "Mỗi thách thức là cơ hội để phát triển và truyền cảm hứng! 💪",
        "Bạn không chỉ dạy học, bạn đang xây dựng tương lai! 🏗️",
        "Sự nhiệt huyết của bạn sẽ lan tỏa đến từng học sinh! 🔥",
        "Hôm nay hãy là phiên bản tốt nhất của chính mình! ⭐",
        "Mỗi ngày mới là một trang sách mới trong hành trình giáo dục! 📖",
        "Sự kiên trì và tình yêu sẽ tạo ra những điều kỳ diệu! 🌺",
        "Bạn là người hướng dẫn, người truyền cảm hứng, và người bạn của học sinh! 🤝",
        "Hôm nay hãy thắp sáng ngọn lửa ham học hỏi trong mỗi học sinh! 🔆",
        "Mỗi bài học là một viên gạch xây dựng tương lai! 🧱",
        "Sự sáng tạo và đổi mới sẽ làm cho việc học trở nên thú vị! 🎨",
        "Bạn đang tạo ra những thay đổi tích cực trong thế giới! 🌍",
        "Hôm nay hãy để tình yêu giáo dục dẫn đường! ❤️"
      ];
      
      // Sử dụng seed để chọn câu nói cố định cho ngày hôm nay
      const hash = seed.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0);
      const quoteIndex = Math.abs(hash) % quotes.length;
      
      setDailyQuote(quotes[quoteIndex]);
    } catch (error) {
      console.error('Error fetching daily quote:', error);
      setDailyQuote("Hôm nay là một ngày tuyệt vời để truyền cảm hứng cho học sinh! 🌟");
    } finally {
      setQuoteLoading(false);
    }
  };



  // Function to fetch calendar data
  const fetchCalendarData = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

              // Fetch events - chỉ lấy sự kiện mà user đã tham gia để hiển thị trên calendar
      const eventsResponse = await fetch(`${API_ENDPOINTS.EVENTS}/joined`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (eventsResponse.ok) {
        const eventsData = await eventsResponse.json();
        
        setCalendarEvents(eventsData);
        
        // Calculate today's activities (chỉ tính sự kiện đã tham gia)
        const today = new Date().toISOString().split('T')[0];
        const todayEvents = eventsData.filter(event => {
          const eventStart = new Date(event.start_date);
          const eventEnd = new Date(event.end_date);
          const todayDate = new Date(today);
          todayDate.setHours(0, 0, 0, 0);
          eventStart.setHours(0, 0, 0, 0);
          eventEnd.setHours(0, 0, 0, 0);
          return todayDate >= eventStart && todayDate <= eventEnd;
        });
        setTodayActivities(todayEvents.length);
      }

      // Fetch diaries
      const diariesResponse = await fetch(`${API_ENDPOINTS.DIARY}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (diariesResponse.ok) {
        const diariesData = await diariesResponse.json();
        setCalendarDiaries(diariesData);
        
        // Calculate recent diaries (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recentDiariesCount = diariesData.filter(diary => 
          new Date(diary.date) >= sevenDaysAgo
        ).length;
        setRecentDiaries(recentDiariesCount);
      }

      // Fetch community posts
      const postsResponse = await fetch(`${API_ENDPOINTS.COMMUNITY}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (postsResponse.ok) {
        const postsData = await postsResponse.json();
        
        // Calculate new posts (last 24 hours)
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);
        const newPostsCount = postsData.filter(post => 
          new Date(post.created_at) >= oneDayAgo
        ).length;
        setNewPosts(newPostsCount);
      }
      
      // Fetch daily quote after getting user data
      await fetchDailyQuote();
    } catch (error) {
      console.error('Error fetching calendar data:', error);
    }
  };

  // Function to update calendar data
  const updateCalendarData = (type, data) => {
    if (type === 'event') {
      setCalendarEvents(prev => [...prev, data]);
    } else if (type === 'diary') {
      setCalendarDiaries(prev => [...prev, data]);
    } else if (type === 'post') {
      // Refresh posts data for dashboard stats
      fetchCalendarData();
    }
  };

  // Expose update function to child components
  const calendarUpdateFunctions = {
    addEvent: (eventData) => updateCalendarData('event', eventData),
    addDiary: (diaryData) => updateCalendarData('diary', diaryData),
    addPost: (postData) => updateCalendarData('post', postData)
  };

  // Expose fetchCalendarData to window for child components
  useEffect(() => {
    window.fetchCalendarData = fetchCalendarData;
    return () => {
      delete window.fetchCalendarData;
    };
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      checkAuthStatus();
    } else {
      setLoading(false);
    }
  }, []);

  // Load user data from localStorage on app start
  useEffect(() => {
    const savedUserData = localStorage.getItem('userData');
    const accessToken = localStorage.getItem('accessToken');
    
    if (savedUserData && accessToken) {
      try {
        const userData = JSON.parse(savedUserData);
        setUser(userData);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Error parsing saved user data:', error);
        localStorage.removeItem('userData');
      }
    }
  }, []);

  // Fetch calendar data when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchCalendarData();
    }
  }, [isAuthenticated]);

  const handleDayClick = (day) => {
    const clickedDate = new Date(selectedYear, selectedMonth, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    clickedDate.setHours(0, 0, 0, 0);
    
    // Kiểm tra sự kiện của ngày được chọn (bao gồm sự kiện đa ngày)
    const dayEvents = calendarEvents.filter(event => {
      const eventStart = new Date(event.start_date);
      const eventEnd = new Date(event.end_date);
      eventStart.setHours(0, 0, 0, 0);
      eventEnd.setHours(0, 0, 0, 0);
      
      return clickedDate >= eventStart && clickedDate <= eventEnd;
    });
    
    console.log(`Day ${day} clicked: Found ${dayEvents.length} events`);
    dayEvents.forEach(event => {
      console.log(`- Event: ${event.title} (${event.start_date} to ${event.end_date})`);
    });
    
    setSelectedDate(clickedDate);
    setSelectedDayEvents(dayEvents);
    setShowDayModal(true);
  };

  const isDateInPast = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    return date < today;
  };

  const handleCreateDiary = () => {
    setShowDayModal(false);
    setActiveTab('diary');
  };

  const handleCreateEvent = () => {
    setShowDayModal(false);
    setActiveTab('events');
    // Pre-fill the event form with the selected date
    setTimeout(() => {
      const eventForm = document.querySelector('.create-event-form');
      if (eventForm) {
        const startDateInput = eventForm.querySelector('input[type="date"]');
        const endDateInput = eventForm.querySelectorAll('input[type="date"]')[1];
        if (startDateInput && endDateInput) {
          const selectedDateStr = selectedDate.toISOString().split('T')[0];
          startDateInput.value = selectedDateStr;
          endDateInput.value = selectedDateStr;
        }
      }
    }, 100);
  };

  const closeDayModal = () => {
    setShowDayModal(false);
    setSelectedDate(null);
    setSelectedDayEvents([]);
  };

  const checkAuthStatus = async () => {
    try {
              const response = await fetch(API_ENDPOINTS.AUTH_PROFILE, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      
      if (response.ok) {
        const userData = await response.json();
        
        // Fetch profile data after authentication
        try {
          const profileResponse = await fetch(API_ENDPOINTS.PROFILE_ME, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            }
          });
          
          if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            if (profileData.success && profileData.data) {
              // Update user with profile data
              const updatedUser = {
                ...userData,
                first_name: profileData.data.first_name || userData.first_name,
                last_name: profileData.data.last_name || userData.last_name,
                email: profileData.data.email || userData.email,
                gender: profileData.data.gender || userData.gender
              };
              
              // Save to localStorage for persistence
              localStorage.setItem('userData', JSON.stringify(updatedUser));
              setUser(updatedUser);
            } else {
              // Save auth user data if no profile
              localStorage.setItem('userData', JSON.stringify(userData));
              setUser(userData);
            }
          } else {
            // Save auth user data if profile fetch fails
            localStorage.setItem('userData', JSON.stringify(userData));
            setUser(userData);
          }
        } catch (profileError) {
          console.error('Profile fetch error:', profileError);
          // Save auth user data if profile fetch fails
          localStorage.setItem('userData', JSON.stringify(userData));
          setUser(userData);
        }
        
        setIsAuthenticated(true);
      } else {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userData');
      }
    } catch (error) {
      console.error('Auth check error:', error);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userData');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      // Split name into first_name and last_name
      const nameParts = authData.name.trim().split(' ');
      const first_name = nameParts[0] || '';
      const last_name = nameParts.slice(1).join(' ') || '';
      
              const response = await fetch(API_ENDPOINTS.AUTH_REGISTER, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          first_name,
          last_name,
          email: authData.email,
          password: authData.password
        })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        // Hiển thị thông báo thành công
        setError(''); // Xóa lỗi cũ nếu có
        showNotification('Đăng ký thành công! Vui lòng đăng nhập để tiếp tục.', 'success');
        
        // Xóa form đăng ký trước
        setAuthData({
          name: '',
          email: '',
          password: ''
        });
        
        // Chuyển về tab đăng nhập sau
        setTimeout(() => {
          setAuthMode('login');
        }, 100);
      } else {
        setError(data.message || 'Đăng ký thất bại');
      }
    } catch (error) {
      console.error('Register error:', error);
      setError('Lỗi kết nối');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
              const response = await fetch(API_ENDPOINTS.AUTH_LOGIN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: authData.email,
          password: authData.password
        })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        localStorage.setItem('accessToken', data.data.accessToken);
        localStorage.setItem('refreshToken', data.data.refreshToken);
        
        // Save user data to localStorage for persistence
        localStorage.setItem('userData', JSON.stringify(data.data.user));
        setUser(data.data.user);
        setIsAuthenticated(true);
        await fetchDailyQuote();
      } else {
        setError(data.message || 'Đăng nhập thất bại');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Lỗi kết nối');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
    setIsAuthenticated(false);
    setActiveTab('dashboard');
  };

  const handleRefreshToken = () => {
    // Force logout and redirect to login
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
    setIsAuthenticated(false);
    setAuthMode('login');
            showNotification('Đã đăng xuất. Vui lòng đăng nhập lại để cập nhật thông tin.', 'info');
  };

  const renderAuthForm = () => (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>TVD_School_Platform</h2>
          <p>Đăng nhập hoặc đăng ký để tiếp tục</p>
        </div>
        
        <div className="auth-tabs">
          <button 
            className={`auth-tab ${authMode === 'login' ? 'active' : ''}`}
            onClick={() => setAuthMode('login')}
          >
            Đăng nhập
          </button>
          <button 
            className={`auth-tab ${authMode === 'register' ? 'active' : ''}`}
            onClick={() => setAuthMode('register')}
          >
            Đăng ký
          </button>
        </div>
        
        <form onSubmit={authMode === 'login' ? handleLogin : authMode === 'register' ? handleRegister : (e) => e.preventDefault()} className="auth-form">
          {authMode === 'register' && (
            <div className="form-group">
              <label>Họ tên:</label>
              <input
                type="text"
                value={authData.name}
                onChange={(e) => setAuthData({...authData, name: e.target.value})}
                required
                placeholder="Nhập họ tên..."
              />
            </div>
          )}

          {authMode === 'forgot' && (
            <div className="form-group">
              <label>Nhập email để đặt lại mật khẩu:</label>
              <input
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
          )}

          {(authMode === 'login' || authMode === 'register') && (
            <>
              <div className="form-group">
                <label>Email:</label>
                <input
                  type="email"
                  value={authData.email}
                  onChange={(e) => setAuthData({...authData, email: e.target.value})}
                  required
                  placeholder="Nhập email..."
                />
              </div>
              
              <div className="form-group">
                <label>Mật khẩu:</label>
                <input
                  type="password"
                  value={authData.password}
                  onChange={(e) => setAuthData({...authData, password: e.target.value})}
                  required
                  placeholder="Nhập mật khẩu..."
                />
              </div>
            </>
          )}

          {authMode === 'login' && (
            <div style={{ textAlign: 'right', marginTop: '-8px' }}>
              <button
                type="button"
                className="auth-link"
                onClick={() => {
                  setForgotEmail(authData.email || '');
                  setAuthMode('forgot');
                }}
              >
                Quên mật khẩu?
              </button>
            </div>
          )}
          
          {authMode === 'forgot' && (
            <div style={{ textAlign: 'right', marginTop: '-8px', marginBottom: '10px' }}>
              <button
                type="button"
                className="auth-link"
                onClick={() => setAuthMode('login')}
              >
                ← Quay lại đăng nhập
              </button>
            </div>
          )}
          
          {error && <div className="error-message">{error}</div>}
          
          {authMode === 'login' || authMode === 'register' ? (
            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? 'Đang xử lý...' : (authMode === 'login' ? 'Đăng nhập' : 'Đăng ký')}
            </button>
          ) : authMode === 'forgot' && (
            <button 
              type="button" 
              className="auth-btn" 
              disabled={loading}
              onClick={async () => {
                try {
                  setLoading(true);
                  const res = await fetch(API_ENDPOINTS.AUTH_FORGOT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: forgotEmail })
                  });
                  
                  if (res.ok) {
                    const data = await res.json();
                    if (data.newPassword) {
                      setNewPassword(data.newPassword);
                      setShowPasswordPopup(true);
                      showNotification('Mật khẩu mới đã được tạo!', 'success');
                    } else {
                      showNotification('Mật khẩu mới đã được gửi qua email', 'success');
                      setAuthMode('login');
                    }
                  } else {
                    showNotification('Email không tồn tại trong hệ thống', 'error');
                  }
                } catch (err) {
                  showNotification('Không gửi được yêu cầu', 'error');
                } finally {
                  setLoading(false);
                }
              }}
            >
              Gửi mật khẩu mới
            </button>
          )}
        </form>
        
        <div className="auth-footer">
          {authMode !== 'forgot' && authMode !== 'reset' ? (
            <p>
              {authMode === 'login' ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}
              <button 
                className="auth-link"
                onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
              >
                {authMode === 'login' ? 'Đăng ký ngay' : 'Đăng nhập'}
              </button>
            </p>
          ) : (
            <p>
              <button className="auth-link" onClick={() => setAuthMode('login')}>Quay lại đăng nhập</button>
            </p>
          )}
        </div>
      </div>
      
      {/* Popup hiển thị mật khẩu mới */}
      {showPasswordPopup && (
        <div className="password-popup-overlay">
          <div className="password-popup">
            <h3>Mật khẩu mới của bạn</h3>
            <div className="password-display">
              <input
                type="text"
                value={newPassword}
                readOnly
                className="password-input"
              />
              <button
                type="button"
                className="copy-btn"
                onClick={() => {
                  navigator.clipboard.writeText(newPassword);
                  showNotification('Đã copy mật khẩu vào clipboard!', 'success');
                }}
              >
                Copy
              </button>
            </div>
            <p className="password-note">
              Hãy copy mật khẩu này và sử dụng để đăng nhập. 
              Sau khi đăng nhập thành công, bạn nên đổi mật khẩu mới.
            </p>
            <div className="password-popup-buttons">
              <button
                type="button"
                className="auth-btn"
                onClick={() => {
                  setShowPasswordPopup(false);
                  setAuthMode('login');
                  setAuthData({...authData, email: forgotEmail, password: ''});
                }}
              >
                Đăng nhập ngay
              </button>
              <button
                type="button"
                className="auth-link"
                onClick={() => setShowPasswordPopup(false)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderDashboard = () => {
    const getDaysInMonth = (month, year) => {
      return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (month, year) => {
      return new Date(year, month, 1).getDay();
    };

    const renderCalendar = () => {
      const daysInMonth = getDaysInMonth(selectedMonth, selectedYear);
      const firstDay = getFirstDayOfMonth(selectedMonth, selectedYear);
      const days = [];

      // Add empty cells for days before the first day of the month
      for (let i = 0; i < firstDay; i++) {
        days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
      }

      // Add days of the month
      for (let day = 1; day <= daysInMonth; day++) {
        const isToday = day === today.getDate() && selectedMonth === today.getMonth() && selectedYear === today.getFullYear();
        const currentDate = new Date(selectedYear, selectedMonth, day);
        const dayEvents = calendarEvents.filter(event => {
          const eventStart = new Date(event.start_date);
          const eventEnd = new Date(event.end_date);
          const currentDateOnly = new Date(currentDate);
          currentDateOnly.setHours(0, 0, 0, 0);
          
          // Reset time for event dates to compare only dates
          const eventStartDate = new Date(eventStart);
          eventStartDate.setHours(0, 0, 0, 0);
          const eventEndDate = new Date(eventEnd);
          eventEndDate.setHours(0, 0, 0, 0);
          
          const isInRange = currentDateOnly >= eventStartDate && currentDateOnly <= eventEndDate;
          
          // Debug log for day 8-11
          if (day >= 8 && day <= 11) {
            console.log(`Day ${day}: Event "${event.title}" (${eventStartDate.toDateString()} - ${eventEndDate.toDateString()}) in range: ${isInRange}`);
          }
          
          return isInRange;
        });
        const dayDiaries = calendarDiaries.filter(diary => 
          new Date(diary.date).toDateString() === currentDate.toDateString()
        );
        
        // Get primary event color for background
        const primaryEvent = dayEvents.length > 0 ? dayEvents[0] : null;
        const backgroundColor = primaryEvent ? getEventColor(primaryEvent.color) : 'transparent';
        const hasMultipleEvents = dayEvents.length > 1;
        
        days.push(
          <div 
            key={day} 
            className={`calendar-day ${isToday ? 'today' : ''} ${dayEvents.length > 0 ? 'has-events' : ''}`}
            onClick={() => handleDayClick(day)}
            style={{
              backgroundColor: backgroundColor,
              color: backgroundColor !== 'transparent' ? 'white' : 'inherit',
              position: 'relative'
            }}
          >
            <span className="day-number">{day}</span>
            {isToday && <div className="today-label">Hôm nay</div>}
            
            {/* Event indicators */}
            {dayEvents.length > 0 && (
              <div className="day-events">
                {dayEvents.slice(0, 2).map((event, index) => (
                  <div 
                    key={`event-${event.id}-${index}`}
                    className="event-dot"
                    style={{ 
                      backgroundColor: hasMultipleEvents ? getEventColor(event.color) : 'rgba(255,255,255,0.8)',
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      margin: '1px',
                      display: 'inline-block'
                    }}
                    title={`${event.title}`}
                  ></div>
                ))}
                {hasMultipleEvents && (
                  <span className="event-count">+{dayEvents.length - 2}</span>
                )}
              </div>
            )}
            
            {/* Diary indicator */}
            {dayDiaries.length > 0 && (
              <div className="diary-indicator" title={`${dayDiaries.length} nhật ký`}>
                📝
              </div>
            )}
          </div>
        );
      }

      return days;
    };

    const monthNames = [
      'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
      'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
    ];

    const goToPreviousMonth = () => {
      if (selectedMonth === 0) {
        setSelectedMonth(11);
        setSelectedYear(selectedYear - 1);
      } else {
        setSelectedMonth(selectedMonth - 1);
      }
    };

    const goToNextMonth = () => {
      if (selectedMonth === 11) {
        setSelectedMonth(0);
        setSelectedYear(selectedYear + 1);
      } else {
        setSelectedMonth(selectedMonth + 1);
      }
    };

    const goToToday = () => {
      setSelectedMonth(currentMonth);
      setSelectedYear(currentYear);
    };

    return (
      <div className="dashboard">
        <div className="dashboard-content">
          <div className="dashboard-left">
            <div className="welcome-banner compact">
              <p className="current-time">{today.toLocaleDateString('vi-VN', { 
                weekday: 'long'
              })} {today.getDate().toString().padStart(2, '0')}/{(today.getMonth() + 1).toString().padStart(2, '0')}/{today.getFullYear()} - {today.toLocaleTimeString('vi-VN')}</p>
              <p className="daily-quote">
                {quoteLoading ? 'Đang tải câu nói động viên...' : dailyQuote}
              </p>
            </div>

            <div className="overview-cards compact">
              <div className="overview-card clickable" onClick={() => setActiveTab('events')}>
                <div className="card-header">
                  <div className="card-icon">📅</div>
                  <h4>Sự kiện</h4>
                </div>
                <div className="card-content">
                  <div className="card-number">{todayActivities}</div>
                  <p>{todayActivities === 0 ? 'Chưa có sự kiện nào' : `${todayActivities} sự kiện`}</p>
                </div>
              </div>
              
              <div className="overview-card clickable" onClick={() => setActiveTab('diary')}>
                <div className="card-header">
                  <div className="card-icon">📝</div>
                  <h4>Nhật ký gần đây</h4>
                </div>
                <div className="card-content">
                  <div className="card-number">{recentDiaries}</div>
                  <p>{recentDiaries === 0 ? 'Chưa có nhật ký nào' : `${recentDiaries} nhật ký (7 ngày qua)`}</p>
                </div>
              </div>
              
              <div className="overview-card clickable" onClick={() => setActiveTab('community')}>
                <div className="card-header">
                  <div className="card-icon">💬</div>
                  <h4>Bài viết mới</h4>
                </div>
                <div className="card-content">
                  <div className="card-number">{newPosts}</div>
                  <p>{newPosts === 0 ? 'Chưa có bài viết nào' : `${newPosts} bài viết (24h qua)`}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="dashboard-right">
            <div className="calendar-section">
              <div className="calendar-header">
                <button onClick={goToPreviousMonth} className="calendar-nav-btn">‹</button>
                <h2>Lịch tháng {monthNames[selectedMonth]} năm {selectedYear}</h2>
                <button onClick={goToNextMonth} className="calendar-nav-btn">›</button>
              </div>
              
              <div className="calendar-container">
                <div className="calendar-weekdays">
                  <div>CN</div>
                  <div>T2</div>
                  <div>T3</div>
                  <div>T4</div>
                  <div>T5</div>
                  <div>T6</div>
                  <div>T7</div>
                </div>
                <div className="calendar-grid">
                  {renderCalendar()}
                </div>
              </div>
              
              <div className="calendar-actions">
                <button onClick={goToToday} className="btn-secondary">Hôm nay</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };



  if (loading) {
    return <div className="loading">Đang tải...</div>;
  }

  if (!isAuthenticated) {
    return renderAuthForm();
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <div className="logo" onClick={handleRefreshToken} style={{ cursor: 'pointer' }} title="Cập nhật thông tin">
            <svg width="40" height="40" viewBox="0 0 100 100">
              {/* Outer ring */}
              <circle cx="50" cy="50" r="45" fill="none" stroke="#1e3a8a" strokeWidth="3"/>
              
              {/* Top text - TRƯỜNG TIỂU HỌC */}
              <path d="M 15 50 A 35 35 0 0 1 85 50" fill="none" stroke="none"/>
              <text x="50" y="25" textAnchor="middle" fontSize="8" fill="#000" fontWeight="bold">TRƯỜNG TIỂU HỌC</text>
              
              {/* Graduation cap */}
              <rect x="35" y="30" width="30" height="8" fill="#1e3a8a" rx="2"/>
              <rect x="40" y="25" width="20" height="8" fill="#1e3a8a" rx="2"/>
              <circle cx="65" cy="35" r="2" fill="#fbbf24"/>
              
              {/* TVĐ initials */}
              <text x="50" y="50" textAnchor="middle" fontSize="12" fill="#1e3a8a" fontWeight="bold">TVĐ</text>
              
              {/* Horizontal bar with stars */}
              <rect x="25" y="55" width="50" height="3" fill="#1e3a8a"/>
              <circle cx="30" cy="56.5" r="1.5" fill="white"/>
              <circle cx="70" cy="56.5" r="1.5" fill="white"/>
              
              {/* Bottom text - TRẦN VĂN ĐANG */}
              <text x="50" y="75" textAnchor="middle" fontSize="8" fill="white" fontWeight="bold">TRẦN VĂN ĐANG</text>
            </svg>
          </div>
          <h1>TVD_School_Platform</h1>
        </div>
        
        <nav className="nav-tabs">
          <button 
            className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            Bảng điều khiển
          </button>
          <button 
            className={`nav-tab ${activeTab === 'events' ? 'active' : ''}`}
            onClick={() => setActiveTab('events')}
          >
            Sự kiện
          </button>
          <button 
            className={`nav-tab ${activeTab === 'community' ? 'active' : ''}`}
            onClick={() => setActiveTab('community')}
          >
            Cộng đồng
          </button>
          <button 
            className={`nav-tab ${activeTab === 'diary' ? 'active' : ''}`}
            onClick={() => setActiveTab('diary')}
          >
            Nhật ký
          </button>
        </nav>
        
        <div className="nav-user">
          <span 
            className="user-icon" 
            style={{ cursor: 'pointer' }}
            onClick={() => {
              setSelectedUserId(user?.id);
              setShowProfileModal(true);
            }}
            title="Hồ sơ cá nhân"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="24px" height="24px">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          </span>
          <button onClick={handleLogout} className="btn-logout">Đăng xuất</button>
        </div>
      </header>

      <main className="app-main">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'events' && <EventsComponent onEventCreated={calendarUpdateFunctions.addEvent} showNotification={showNotification} />}
                           {activeTab === 'community' && <CommunityComponent 
            onPostCreated={calendarUpdateFunctions.addPost} 
            onUserClick={(userId) => {
              setSelectedUserId(userId);
              setShowProfileModal(true);
            }}
            currentUser={user}
            showReactionModal={showReactionModal}
            setShowReactionModal={setShowReactionModal}
            selectedPostReactions={selectedPostReactions}
            setSelectedPostReactions={setSelectedPostReactions}
            reactionStats={reactionStats}
            setReactionStats={setReactionStats}
            showNotification={showNotification}
          />}
        {activeTab === 'diary' && <DiaryComponent onDiaryCreated={calendarUpdateFunctions.addDiary} showNotification={showNotification} />}
      </main>

      {/* Day Click Modal */}
      {showDayModal && (
        <div className="modal-overlay" onClick={closeDayModal}>
          <div className="day-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
                              <h3>Ngày {selectedDate ? `${selectedDate.getDate().toString().padStart(2, '0')}/${(selectedDate.getMonth() + 1).toString().padStart(2, '0')}/${selectedDate.getFullYear()}` : ''}</h3>
              <button className="modal-close" onClick={closeDayModal}>×</button>
            </div>
            <div className="modal-content">
              {/* Hiển thị sự kiện nếu có */}
              {selectedDayEvents.length > 0 && (
                <div className="day-events-section">
                  <h4>📅 Sự kiện trong ngày</h4>
                  <div className="events-list">
                    {selectedDayEvents.map((event, index) => (
                      <div key={event.id} className="event-item" style={{ borderLeft: `4px solid ${getEventColor(event.color)}` }}>
                        <div className="event-header">
                          <span className="event-title">{event.title}</span>
                          <span className="event-time">
                            {event.start_time && event.end_time ? 
                              `${formatTime(event.start_time)} - ${formatTime(event.end_time)}` : 
                              'Cả ngày'
                            }
                          </span>
                        </div>
                        {event.creator_name && (
                          <div className="event-creator">Tạo bởi: {event.creator_name}</div>
                        )}
                        {event.description && (
                          <div className="event-description">{event.description}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Hiển thị tùy chọn tạo mới nếu chưa có sự kiện hoặc ngày chưa qua */}
              {selectedDayEvents.length === 0 && !isDateInPast(selectedDate) && (
                <div className="create-options">
                  <h4>Bạn muốn tạo gì?</h4>
                  <button className="modal-btn event-btn" onClick={handleCreateEvent}>
                    <span className="btn-icon">📅</span>
                    <span className="btn-text">Tạo sự kiện</span>
                  </button>
                  <button className="modal-btn diary-btn" onClick={handleCreateDiary}>
                    <span className="btn-icon">📝</span>
                    <span className="btn-text">Viết nhật ký</span>
                  </button>
                </div>
              )}
              
              {/* Hiển thị thông báo nếu ngày đã qua và không có sự kiện */}
              {selectedDayEvents.length === 0 && isDateInPast(selectedDate) && (
                <div className="past-date-message">
                  <div className="message-icon">👁️</div>
                  <div className="message-text">
                    <h4>Chỉ xem được</h4>
                    <p>Ngày này đã qua và không có sự kiện nào</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {showProfileModal && selectedUserId && (
        <ProfileComponent 
          userId={selectedUserId} 
          onClose={() => {
            setShowProfileModal(false);
            setSelectedUserId(null);
          }}
          setUser={setUser}
          currentUser={user}
          showNotification={showNotification}
        />
      )}

      {/* Notification Component */}
      {notification.show && (
        <div className={`notification ${notification.type}`}>
          <div className="notification-content">
            <span className="notification-message">{notification.message}</span>
            <button 
              className="notification-close" 
              onClick={() => setNotification({ show: false, message: '', type: 'info' })}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App; 