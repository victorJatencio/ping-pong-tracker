/**
 * Format a date for display in the UI
 * @param {Timestamp} scheduledDate - Firebase Timestamp
 * @param {string} timeString - Time string in format "HH:MM"
 * @returns {string} - Formatted date string
 */
export const formatScheduledDateTime = (scheduledDate, timeString) => {
    if (!scheduledDate) return 'Unknown';
    
    // Convert scheduledDate (Timestamp) to Date
    const dateObj = scheduledDate instanceof Date ? scheduledDate : scheduledDate.toDate();
    
    // If time string is provided, adjust the hours and minutes
    if (timeString) {
        const [hours, minutes] = timeString.split(':').map(Number);
        dateObj.setHours(hours, minutes);
    }
    
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Check if date is today
    if (dateObj.toDateString() === now.toDateString()) {
        return `Today, ${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // Check if date is tomorrow
    if (dateObj.toDateString() === tomorrow.toDateString()) {
        return `Tomorrow, ${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // Otherwise, return full date
    return dateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};