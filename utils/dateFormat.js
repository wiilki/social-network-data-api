const addDateSuffix = date => {
    let dateStr = date.toString();
  
    // Get the last character of the date string to determine if the date suffix should be 'th', 'st', 'nd', or 'rd'
    const lastChar = dateStr.charAt(dateStr.length - 1);
  
    if (lastChar === '1' && dateStr !== '11') {
      dateStr = `${dateStr}st`;
    } else if (lastChar === '2' && dateStr !== '12') {
      dateStr = `${dateStr}nd`;
    } else if (lastChar === '3' && dateStr !== '13') {
      dateStr = `${dateStr}rd`;
    } else {
      dateStr = `${dateStr}th`;
    }
  
    return dateStr;
  };
  
  // Function to format a timestamp into a string in the format of Month Day, Year at Hour:Minutes AM/PM
  module.exports = timestamp => {
    const monthsArr = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December'
    ];
  
    const dateObj = new Date(timestamp);
    const month = monthsArr[dateObj.getMonth()];
    const day = addDateSuffix(dateObj.getDate());
    const year = dateObj.getFullYear();
    let hour = dateObj.getHours();
    const minutes = dateObj.getMinutes();
    let period = 'AM';
  
    if (hour > 12) {
      hour -= 12;
      period = 'PM';
    }
  
    return `${month} ${day}, ${year} at ${hour}:${minutes} ${period}`;
  };
  