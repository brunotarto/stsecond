const IpLog = require('../models/ipLogModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const axios = require('axios');

exports.logUserIp = catchAsync(async (userIp, userId) => {
  // Generate a key for today's date
  const today = new Date().toISOString().split('T')[0];

  // Check if the IP has already been logged today
  const existingLog = await IpLog.findOne({
    user: userId,
    ip: userIp,
    accessedAt: {
      $gte: new Date(today),
      $lt: new Date(`${today}T23:59:59.999Z`),
    },
  });

  let country = 'unknown'; // Default to 'unknown'

  // If not, log it
  if (!existingLog) {
    try {
      const response = await axios.get(`http://ip-api.com/json/${userIp}`);
      if (response.data.status === 'success') {
        country = response.data.country;
      }
    } catch (error) {
      console.error('Error fetching country information:', error);
    }

    await IpLog.create({
      ip: userIp,
      country: country,
      user: userId,
      accessedAt: new Date(),
    });
  }
});

// Get all IP logs for admin
exports.getAllIpLogs = catchAsync(async (req, res, next) => {
  const logs = await IpLog.aggregate([
    {
      $group: {
        _id: '$ip', // Group by IP address
        users: {
          $addToSet: '$user', // Add unique user IDs to the 'users' array
        },
      },
    },
    {
      $match: {
        'users.1': { $exists: true }, // Filter for documents where 'users' array has at least 2 elements
      },
    },
    {
      $lookup: {
        from: 'users', // Use the 'users' collection
        localField: 'users', // Match 'users' field in this collection
        foreignField: '_id', // Against '_id' in 'users' collection
        as: 'userDetails', // Output in 'userDetails' field
      },
    },
    {
      $project: {
        ip: '$_id',
        users: {
          $map: {
            input: '$userDetails',
            as: 'user',
            in: {
              userId: '$$user._id',
              email: '$$user.email',
            },
          },
        },
      },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      logs,
    },
  });
});

// Get IP logs by user ID for admin
exports.getIpLogsByUserId = catchAsync(async (req, res, next) => {
  const { userId } = req.params;
  const ipLogs = await IpLog.find({ user: userId }).select('-__v');

  res.status(200).json({
    status: 'success',
    data: ipLogs,
  });
});
