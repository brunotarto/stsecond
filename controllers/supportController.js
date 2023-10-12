const sendTemplatedEmail = require('../utils/email');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const getCurrentTime = require('../utils/getCurrentTime');

const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
function generateString(length) {
  let result = ' ';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }

  return result;
}

exports.support = catchAsync(async (req, res, next) => {
  const ticketId = generateString(2) + '-' + generateString(5);

  if (!req.body.name || !req.body.emailFrom || !req.body.emailBody) {
    return next(
      new AppError(
        'Missing required parameters. Please ensure name, emailFrom, emailBody are included in the request body.',
        400
      )
    );
  }

  const emailData = {
    name: req.body.name,
    email: process.env.EMAIL_USERNAME,
    emailFrom: req.body.emailFrom,
    emailBody: req.body.emailBody,
    date: getCurrentTime(),
  };

  await sendTemplatedEmail(
    'support',
    'Support Request ID:' + ticketId,
    emailData
  );

  res.status(200).json({
    status: 'success',
    data: {
      ticketId,
    },
  });
});
