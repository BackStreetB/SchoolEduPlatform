// Debug Calendar Component
console.log('🔍 Debug Calendar Component Loaded');

// Test function để kiểm tra calendar
function testCalendarFeatures() {
  console.log('🧪 Testing Calendar Features...');
  
  // Kiểm tra GoogleCalendar component
  const calendarElement = document.querySelector('.google-calendar');
  if (calendarElement) {
    console.log('✅ GoogleCalendar component found');
    
    // Kiểm tra time slots clickable
    const timeSlots = document.querySelectorAll('.time-slot-clickable');
    console.log(`🎯 Found ${timeSlots.length} clickable time slots`);
    
    // Kiểm tra modal
    const modal = document.querySelector('.create-modal-overlay');
    if (modal) {
      console.log('✅ Create modal found');
    } else {
      console.log('❌ Create modal not found');
    }
    
    // Kiểm tra CSS
    const computedStyle = window.getComputedStyle(calendarElement);
    console.log('🎨 Calendar CSS loaded:', computedStyle.fontFamily);
    
  } else {
    console.log('❌ GoogleCalendar component not found');
  }
  
  // Kiểm tra MediaUpload component
  const mediaUpload = document.querySelector('.media-upload');
  if (mediaUpload) {
    console.log('✅ MediaUpload component found');
  } else {
    console.log('❌ MediaUpload component not found');
  }
}

// Auto-test khi page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', testCalendarFeatures);
} else {
  testCalendarFeatures();
}

// Test click vào time slot
function simulateTimeSlotClick(hour = 9) {
  console.log(`🎯 Simulating click on time slot ${hour}:00`);
  
  // Tìm time slot
  const timeSlot = document.querySelector(`.time-slot-clickable[style*="top: ${hour * 60}px"]`);
  if (timeSlot) {
    console.log('✅ Time slot found, clicking...');
    timeSlot.click();
    
    // Kiểm tra modal
    setTimeout(() => {
      const modal = document.querySelector('.create-modal-overlay');
      if (modal && modal.style.display !== 'none') {
        console.log('✅ Modal displayed successfully');
      } else {
        console.log('❌ Modal not displayed');
      }
    }, 100);
    
  } else {
    console.log('❌ Time slot not found');
  }
}

// Expose test functions to window
window.testCalendarFeatures = testCalendarFeatures;
window.simulateTimeSlotClick = simulateTimeSlotClick;

console.log('🚀 Debug functions available: testCalendarFeatures(), simulateTimeSlotClick(hour)');
