import React, { useState, useEffect } from 'react';
import './GoogleCalendar.css';

const GoogleCalendar = ({ events = [], diaries = [], onEventClick, onDiaryClick, onTimeSlotClick, onCreateDiary, onCreateEvent }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month'); // year, month, week, day
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [createType, setCreateType] = useState('diary'); // 'diary' or 'event'

  // Debug: Log props
  useEffect(() => {
    console.log('🔍 GoogleCalendar props:', {
      events: events.length,
      diaries: diaries.length,
      onCreateDiary: !!onCreateDiary,
      onCreateEvent: !!onCreateEvent,
      view: view
    });
  }, [events, diaries, onCreateDiary, onCreateEvent, view]);

  // Debug: Log current state
  useEffect(() => {
    console.log('📊 GoogleCalendar state:', {
      currentDate: currentDate.toISOString(),
      view: view,
      showCreateModal: showCreateModal,
      selectedTimeSlot: selectedTimeSlot
    });
  }, [currentDate, view, showCreateModal, selectedTimeSlot]);

  // Vietnamese holidays 2025
  const vietnamHolidays = {
    '2025-01-01': 'Tết Dương lịch',
    '2025-01-28': 'Tết Nguyên Đán (28/1)',
    '2025-01-29': 'Tết Nguyên Đán (29/1)',
    '2025-01-30': 'Tết Nguyên Đán (30/1)',
    '2025-01-31': 'Tết Nguyên Đán (31/1)',
    '2025-02-01': 'Tết Nguyên Đán (1/2)',
    '2025-02-02': 'Tết Nguyên Đán (2/2)',
    '2025-04-18': 'Giỗ Tổ Hùng Vương',
    '2025-04-30': 'Ngày Giải phóng miền Nam',
    '2025-05-01': 'Ngày Quốc tế Lao động',
    '2025-09-02': 'Ngày Quốc khánh'
  };

  // Handle time slot click
  const handleTimeSlotClick = (hour, date = null) => {
    console.log('🎯 Time slot clicked:', { hour, date, currentDate });
    const targetDate = date || currentDate;
    const clickedTime = new Date(targetDate);
    clickedTime.setHours(hour, 0, 0, 0);
    
    setSelectedTimeSlot({
      date: targetDate,
      hour: hour,
      time: clickedTime
    });
    setCreateType('diary'); // Default to diary
    setShowCreateModal(true);
    console.log('✅ Modal should be visible now');
  };

  // Handle create diary
  const handleCreateDiary = () => {
    console.log('📝 Creating diary from calendar');
    if (onCreateDiary && selectedTimeSlot) {
      onCreateDiary({
        date: selectedTimeSlot.date,
        time: selectedTimeSlot.time,
        hour: selectedTimeSlot.hour
      });
    }
    setShowCreateModal(false);
  };

  // Handle create event
  const handleCreateEvent = () => {
    console.log('📅 Creating event from calendar');
    if (onCreateEvent && selectedTimeSlot) {
      onCreateEvent({
        date: selectedTimeSlot.date,
        time: selectedTimeSlot.time,
        hour: selectedTimeSlot.hour
      });
    }
    setShowCreateModal(false);
  };

  // Close modal
  const closeModal = () => {
    console.log('❌ Closing modal');
    setShowCreateModal(false);
    setSelectedTimeSlot(null);
  };

  const getHoliday = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    return vietnamHolidays[dateStr];
  };

  // Navigation functions
  const goToPrevious = () => {
    const newDate = new Date(currentDate);
    if (view === 'year') {
      newDate.setFullYear(newDate.getFullYear() - 1);
    } else if (view === 'month') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else if (view === 'day') {
      newDate.setDate(newDate.getDate() - 1);
    }
    setCurrentDate(newDate);
  };

  const goToNext = () => {
    const newDate = new Date(currentDate);
    if (view === 'year') {
      newDate.setFullYear(newDate.getFullYear() + 1);
    } else if (view === 'month') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else if (view === 'day') {
      newDate.setDate(newDate.getDate() + 1);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  // Generate timeline hours for day/week view
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 0; hour < 24; hour++) {
      const period = hour < 12 ? 'AM' : 'PM';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      slots.push({
        hour,
        label: `${displayHour} ${period}`,
        time24: `${hour.toString().padStart(2, '0')}:00`
      });
    }
    return slots;
  };

  // Get current time position for red line
  const getCurrentTimePosition = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    return (hours * 60 + minutes) * (60 / 60); // 60px per hour
  };

  // Format date for display
  const formatDisplayDate = () => {
    const options = { 
      year: 'numeric', 
      month: 'long',
      day: view === 'day' ? 'numeric' : undefined
    };
    return currentDate.toLocaleDateString('vi-VN', options);
  };

  // Get events for specific date (including multi-day events)
  const getEventsForDate = (date) => {
    const viewDate = new Date(date);
    viewDate.setHours(0, 0, 0, 0);
    
    return events.filter(event => {
      const eventStartDate = new Date(event.start_date);
      const eventEndDate = new Date(event.end_date);
      eventStartDate.setHours(0, 0, 0, 0);
      eventEndDate.setHours(0, 0, 0, 0);
      
      // Check if the view date falls within the event's date range
      return viewDate >= eventStartDate && viewDate <= eventEndDate;
    });
  };

  // Get diaries for specific date
  const getDiariesForDate = (date) => {
    const viewDate = new Date(date);
    viewDate.setHours(0, 0, 0, 0);
    
    return diaries.filter(diary => {
      const diaryDate = new Date(diary.date);
      diaryDate.setHours(0, 0, 0, 0);
      
      return viewDate.getTime() === diaryDate.getTime();
    });
  };

  // Calculate event position in timeline for a specific day
  const getEventPosition = (event, currentViewDate, overlappingEvents = [], eventIndex = 0) => {
    const eventStartDate = new Date(event.start_date);
    const eventEndDate = new Date(event.end_date);
    const viewDate = new Date(currentViewDate);
    
    // Reset time to compare dates only
    eventStartDate.setHours(0, 0, 0, 0);
    eventEndDate.setHours(0, 0, 0, 0);
    viewDate.setHours(0, 0, 0, 0);
    
    let startTime, endTime;
    
    // Determine start and end time for the current viewing date
    if (viewDate.getTime() === eventStartDate.getTime() && viewDate.getTime() === eventEndDate.getTime()) {
      // Single day event
      startTime = event.start_time || '00:00:00';
      endTime = event.end_time || '23:59:00';
    } else if (viewDate.getTime() === eventStartDate.getTime()) {
      // First day of multi-day event
      startTime = event.start_time || '00:00:00';
      endTime = '23:59:00';
    } else if (viewDate.getTime() === eventEndDate.getTime()) {
      // Last day of multi-day event
      startTime = '00:00:00';
      endTime = event.end_time || '23:59:00';
    } else if (viewDate > eventStartDate && viewDate < eventEndDate) {
      // Middle day of multi-day event
      startTime = '00:00:00';
      endTime = '23:59:00';
    } else {
      // Event doesn't occur on this date
      return null;
    }
    
    // Fix same start/end time issue
    if (startTime === endTime) {
      const [hour, minute] = startTime.split(':').map(Number);
      if (hour < 23) {
        endTime = `${(hour + 1).toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
      } else {
        endTime = '23:59:00';
      }
    }
    
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    
    const startPosition = (startHour * 60 + startMinute) * (60 / 60); // 60px per hour
    const duration = ((endHour * 60 + endMinute) - (startHour * 60 + startMinute)) * (60 / 60);
    
    // Calculate width and left position for overlapping events
    const totalOverlapping = overlappingEvents.length;
    const width = totalOverlapping > 1 ? 90 / totalOverlapping : 100; // Share width
    const leftOffset = totalOverlapping > 1 ? (eventIndex * width) : 0;
    
    return {
      top: startPosition,
      height: Math.max(duration, 30), // Minimum 30px height
      width: `${width}%`,
      left: `${leftOffset}%`,
      isMultiDay: eventStartDate.getTime() !== eventEndDate.getTime(),
      isFirstDay: viewDate.getTime() === eventStartDate.getTime(),
      isLastDay: viewDate.getTime() === eventEndDate.getTime()
    };
  };

  // Render different views
  const renderYearView = () => {
    const months = [];
    for (let month = 0; month < 12; month++) {
      const monthDate = new Date(currentDate.getFullYear(), month, 1);
      months.push(
        <div key={month} className="year-month" onClick={() => {
          setCurrentDate(monthDate);
          setView('month');
        }}>
          <div className="month-name">
            {monthDate.toLocaleDateString('vi-VN', { month: 'long' })}
          </div>
          <div className="month-grid">
            {/* Mini month calendar */}
            {/* Implementation simplified for now */}
            <div className="mini-calendar">📅</div>
          </div>
        </div>
      );
    }
    return <div className="year-view">{months}</div>;
  };

  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    const weekDays = ['CN', 'TH 2', 'TH 3', 'TH 4', 'TH 5', 'TH 6', 'TH 7'];

    // Header with weekdays
    weekDays.forEach(day => {
      days.push(
        <div key={`header-${day}`} className="month-header-day">
          {day}
        </div>
      );
    });

    // Empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="month-day empty"></div>);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isToday = date.toDateString() === new Date().toDateString();
      const holiday = getHoliday(date);
      const dayEvents = getEventsForDate(date);

      days.push(
        <div
          key={day}
          className={`month-day ${isToday ? 'today' : ''} ${dayEvents.length > 0 ? 'has-events' : ''}`}
          onClick={() => {
            setSelectedDate(date);
            setCurrentDate(date);
            setView('day');
          }}
        >
          <div className="day-number">{day}</div>
          {holiday && <div className="holiday-indicator">🎉</div>}
          {dayEvents.length > 0 && (
            <div className="events-count">{dayEvents.length}</div>
          )}
          <div className="month-events">
            {dayEvents.slice(0, 3).map((event, idx) => (
              <div
                key={idx}
                className="month-event"
                style={{ backgroundColor: event.color || '#3498db' }}
              >
                {event.title}
              </div>
            ))}
            {dayEvents.length > 3 && (
              <div className="more-events">+{dayEvents.length - 3} more</div>
            )}
          </div>
        </div>
      );
    }

    return <div className="month-view">{days}</div>;
  };

  const renderWeekView = () => {
    // Get start of week (Sunday)
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      weekDays.push(date);
    }

    return (
      <div className="week-view">
        <div className="week-header">
          <div className="time-gutter"></div>
          {weekDays.map((date, idx) => (
            <div key={idx} className="week-day-header">
              <div className="day-name">
                {date.toLocaleDateString('vi-VN', { weekday: 'short' })}
              </div>
              <div className={`day-number ${date.toDateString() === new Date().toDateString() ? 'today' : ''}`}>
                {date.getDate()}
              </div>
            </div>
          ))}
        </div>

        <div className="week-body">
          <div className="time-slots">
            {generateTimeSlots().map((slot, idx) => (
              <div key={idx} className="time-slot">
                <div className="time-label">{slot.label}</div>
              </div>
            ))}
          </div>

          <div className="week-days">
            {weekDays.map((date, dayIdx) => {
              const dayEvents = getEventsForDate(date);
              const isToday = date.toDateString() === new Date().toDateString();
              
              return (
                <div key={dayIdx} className="week-day-column">
                  {/* Current time indicator for today */}
                  {isToday && (
                    <div
                      className="current-time-indicator"
                      style={{ top: `${getCurrentTimePosition()}px` }}
                    >
                      <div className="time-marker"></div>
                      <div className="time-line"></div>
                    </div>
                  )}

                  {/* Events */}
                  {dayEvents.map((event, eventIdx) => {
                    const position = getEventPosition(event, date);
                    if (!position) return null; // Skip if event doesn't occur on this date
                    
                    return (
                      <div
                        key={eventIdx}
                        className="week-event"
                        style={{
                          top: `${position.top}px`,
                          height: `${position.height}px`,
                          backgroundColor: event.color || '#3498db'
                        }}
                        onClick={() => onEventClick && onEventClick(event)}
                      >
                        <div className="event-title">{event.title}</div>
                        <div className="event-time">
                          {position.isMultiDay ? (
                            position.isFirstDay ? `Từ ${event.start_time?.substring(0, 5)}` :
                            position.isLastDay ? `Đến ${event.end_time?.substring(0, 5)}` :
                            'Cả ngày'
                          ) : (
                            `${event.start_time?.substring(0, 5)} - ${event.end_time?.substring(0, 5)}`
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    // Use currentDate instead of selectedDate for consistency
    const dayEvents = getEventsForDate(currentDate);
    const dayDiaries = getDiariesForDate(currentDate);
    const isToday = currentDate.toDateString() === new Date().toDateString();
    const holiday = getHoliday(currentDate);
    
    // Debug: Log day view data
    console.log('🌅 renderDayView:', {
      currentDate: currentDate.toISOString(),
      dayEvents: dayEvents.length,
      dayDiaries: dayDiaries.length,
      isToday: isToday,
      holiday: holiday
    });

    return (
      <div className="day-view">
        <div className="day-header">
          <div className="day-info">
            <h2>{currentDate.toLocaleDateString('vi-VN', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</h2>
            {holiday && <div className="holiday-name">🎉 {holiday}</div>}
          </div>
        </div>

        <div className="day-body">
          <div className="time-slots">
            {generateTimeSlots().map((slot, idx) => (
              <div key={idx} className="time-slot">
                <div className="time-label">{slot.label}</div>
              </div>
            ))}
          </div>

          <div className="day-content">
            {/* Clickable time slots */}
            {generateTimeSlots().map((slot, idx) => (
              <div
                key={`slot-${idx}`}
                className="time-slot-clickable"
                style={{
                  top: `${slot.hour * 60}px`,
                  height: '60px'
                }}
                onClick={() => handleTimeSlotClick(slot.hour)}
                title={`Click để tạo nhật ký hoặc sự kiện lúc ${slot.label}`}
              >
                <div className="slot-hover-effect"></div>
              </div>
            ))}

            {/* Current time indicator for today */}
            {isToday && (
              <div
                className="current-time-indicator"
                style={{ top: `${getCurrentTimePosition()}px` }}
              >
                <div className="time-marker"></div>
                <div className="time-line"></div>
              </div>
            )}

            {/* Events */}
            {dayEvents.map((event, idx) => {
              // Find overlapping events for this time slot
              const overlappingEvents = dayEvents.filter(otherEvent => {
                const eventStart = event.start_time || '00:00:00';
                const eventEnd = event.end_time || '23:59:00';
                const otherStart = otherEvent.start_time || '00:00:00';
                const otherEnd = otherEvent.end_time || '23:59:00';
                
                return (
                  (eventStart < otherEnd && eventEnd > otherStart) ||
                  (otherStart < eventEnd && otherEnd > eventStart)
                );
              });
              
              const eventIndex = overlappingEvents.findIndex(e => e.id === event.id);
              const position = getEventPosition(event, currentDate, overlappingEvents, eventIndex);
              
              // Skip if event doesn't occur on this date
              if (!position) return null;
              
              return (
                <div
                  key={event.id || idx}
                  className="day-event"
                  style={{
                    top: `${position.top}px`,
                    height: `${position.height}px`,
                    width: position.width,
                    left: position.left,
                    backgroundColor: event.color || '#3498db'
                  }}
                  onClick={() => onEventClick && onEventClick(event)}
                  title={position.isMultiDay ? 
                    `Multi-day event: ${new Date(event.start_date).toLocaleDateString('vi-VN')} - ${new Date(event.end_date).toLocaleDateString('vi-VN')}` : 
                    event.title
                  }
                >
                  <div className="event-title">
                    {event.title}
                    {position.isMultiDay && (
                      <span className="multi-day-indicator">
                        {position.isFirstDay && ' (Bắt đầu)'}
                        {position.isLastDay && !position.isFirstDay && ' (Kết thúc)'}
                        {!position.isFirstDay && !position.isLastDay && ' (Tiếp tục)'}
                      </span>
                    )}
                  </div>
                  <div className="event-time">
                    {position.isMultiDay ? (
                      position.isFirstDay ? `Từ ${event.start_time?.substring(0, 5)}` :
                      position.isLastDay ? `Đến ${event.end_time?.substring(0, 5)}` :
                      'Cả ngày'
                    ) : (
                      `${event.start_time?.substring(0, 5)} - ${event.end_time?.substring(0, 5)}`
                    )}
                  </div>
                  <div className="event-creator">
                    👤 {event.creator_name || 'Unknown'}
                  </div>
                </div>
              );
            })}

            {/* Diaries */}
            {dayDiaries.map((diary, idx) => {
              // Calculate diary position based on creation time or default to 9 AM
              const diaryTime = diary.created_at ? new Date(diary.created_at) : new Date();
              const diaryHour = diaryTime.getHours();
              const diaryMinute = diaryTime.getMinutes();
              const topPosition = (diaryHour * 60 + diaryMinute) * (60 / 60);
              
              return (
                <div
                  key={`diary-${diary.id}`}
                  className="day-diary"
                  style={{
                    top: `${topPosition}px`,
                    height: '40px',
                    width: '90%',
                    left: '5%',
                    backgroundColor: '#10B981'
                  }}
                  onClick={() => onDiaryClick && onDiaryClick(diary)}
                  title={`Nhật ký: ${diary.title}`}
                >
                  <div className="diary-title">
                    📝 {diary.title}
                  </div>
                  <div className="diary-time">
                    {diaryTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              );
            })}

            {/* Empty state */}
            {dayEvents.length === 0 && dayDiaries.length === 0 && (
              <div className="empty-day">
                <div className="empty-icon">📅</div>
                <p>Không có sự kiện hoặc nhật ký nào trong ngày này</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="google-calendar">
      {/* Toolbar */}
      <div className="calendar-toolbar">
        <div className="toolbar-left">
          <button className="today-btn" onClick={goToToday}>
            Hôm nay
          </button>
          <button className="nav-btn" onClick={goToPrevious}>
            &#8249;
          </button>
          <button className="nav-btn" onClick={goToNext}>
            &#8250;
          </button>
          <h1 className="calendar-title">{formatDisplayDate()}</h1>
        </div>

        <div className="toolbar-right">
          <select 
            className="view-selector"
            value={view}
            onChange={(e) => setView(e.target.value)}
          >
            <option value="day">Ngày</option>
            <option value="week">Tuần</option>
            <option value="month">Tháng</option>
            <option value="year">Năm</option>
          </select>
        </div>
      </div>

      {/* Calendar Content */}
      <div className="calendar-content">
        {view === 'year' && renderYearView()}
        {view === 'month' && renderMonthView()}
        {view === 'week' && renderWeekView()}
        {view === 'day' && renderDayView()}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="create-modal-overlay" onClick={closeModal}>
          <div className="create-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Tạo mới</h3>
              <button className="close-btn" onClick={closeModal}>×</button>
            </div>
            
            <div className="modal-content">
              <div className="time-info">
                <p>Thời gian: {selectedTimeSlot?.date.toLocaleDateString('vi-VN')} lúc {selectedTimeSlot?.hour < 12 ? `${selectedTimeSlot?.hour} AM` : `${selectedTimeSlot?.hour === 12 ? 12 : selectedTimeSlot?.hour - 12} PM`}</p>
              </div>
              
              <div className="create-options">
                <button 
                  className={`create-option ${createType === 'diary' ? 'active' : ''}`}
                  onClick={() => setCreateType('diary')}
                >
                  📝 Tạo nhật ký
                </button>
                <button 
                  className={`create-option ${createType === 'event' ? 'active' : ''}`}
                  onClick={() => setCreateType('event')}
                >
                  📅 Tạo sự kiện
                </button>
              </div>
              
              <div className="modal-actions">
                <button className="btn-cancel" onClick={closeModal}>
                  Hủy
                </button>
                <button 
                  className="btn-create"
                  onClick={createType === 'diary' ? handleCreateDiary : handleCreateEvent}
                >
                  {createType === 'diary' ? 'Tạo nhật ký' : 'Tạo sự kiện'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Debug Info */}
      <div style={{ 
        position: 'fixed', 
        bottom: '10px', 
        right: '10px', 
        background: 'rgba(0,0,0,0.8)', 
        color: 'white', 
        padding: '10px', 
        borderRadius: '5px',
        fontSize: '12px',
        zIndex: 9999
      }}>
        <div>View: {view}</div>
        <div>Modal: {showCreateModal ? 'Visible' : 'Hidden'}</div>
        <div>TimeSlot: {selectedTimeSlot ? `${selectedTimeSlot.hour}:00` : 'None'}</div>
      </div>
    </div>
  );
};

export default GoogleCalendar;
