module.exports = function () {
  const months = [
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
    'December',
  ];
  const now = new Date();
  const month = months[now.getMonth()];
  const day = now.getDate();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const ampm = hour >= 12 ? 'pm' : 'am';

  const formattedHour = hour % 12 || 12;
  const formattedMinute = minute < 10 ? '0' + minute : minute;

  return `${month} ${day} at ${formattedHour}:${formattedMinute}${ampm}`;
};
