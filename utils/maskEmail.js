module.exports = function (email) {
  // const atIndex = email.indexOf('@');
  // const maskedEmail = email.slice(0, 2) + '***' + email.slice(atIndex - 1);
  const maskedEmail = '***' + email.slice(3);
  return maskedEmail;
};
