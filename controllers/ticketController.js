const Ticket = require('../models/ticketModel');
const Message = require('../models/messageModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.createTicket = catchAsync(async (req, res, next) => {
  if (!req.body.subject || !req.body.content) {
    return next(new AppError('Ticked should have subject and content', 404));
  }

  const ticket = await Ticket.create({
    userId: req.user._id,
    subject: req.body.subject,
  });

  const message = await Message.create({
    ticket: ticket._id,
    userId: req.user._id,
    content: req.body.content,
  });

  res.status(201).json({
    status: 'success',
    data: {
      ticket,
      message,
    },
  });
});

exports.getTickets = catchAsync(async (req, res, next) => {
  const baseQuery =
    req.user.role === 'Admin'
      ? Ticket.find()
      : Ticket.find({ userId: req.user._id });

  const tickets = await baseQuery;

  res.status(200).json({
    status: 'success',
    data: {
      tickets,
    },
  });
});

exports.updateTicketStatus = catchAsync(async (req, res, next) => {
  const ticketId = req.params.ticketId;

  // Retrieve the ticket
  const ticket = await Ticket.findById(ticketId);

  // Check if the ticket exists
  if (!ticket) {
    return next(new AppError('No ticket found with that ID', 404));
  }

  // Check if the user is allowed to access the ticket
  if (req.user.role !== 'Admin' && !ticket.userId.equals(req.user._id)) {
    return next(
      new AppError('You do not have permission to access this ticket', 403)
    );
  }

  // Update the ticket's status and updatedAt timestamp
  ticket.status = req.body.status;
  ticket.updatedAt = Date.now();

  // Save the updated ticket
  await ticket.save();

  res.status(200).json({
    status: 'success',
    data: {
      ticket,
    },
  });
});

exports.createMessage = catchAsync(async (req, res, next) => {
  const ticketId = req.params.ticketId;

  // Retrieve the ticket
  const ticket = await Ticket.findById(ticketId);

  // Check if the ticket exists
  if (!ticket) {
    return next(new AppError('No ticket found with that ID', 404));
  }

  if (!req.body.content) {
    return next(new AppError('Message should have content', 404));
  }

  // Check if the user is allowed to access the ticket
  if (req.user.role !== 'Admin' && !ticket.userId.equals(req.user._id)) {
    return next(
      new AppError('You do not have permission to access this ticket', 403)
    );
  }
  const announcer = req.user.role === 'Admin' ? 'Support' : 'User';

  // Create a new message and associate it with the ticket
  const message = await Message.create({
    ticket: ticketId,
    userId: req.user._id,
    content: req.body.content,
    announcer,
  });

  // Update ticket status to 'Open' when a new message is added
  if (ticket.status !== 'Open') {
    ticket.status = 'Open';
    ticket.updatedAt = Date.now();
    ticket = await ticket.save(); // Saving the updated ticket
  }

  res.status(201).json({
    status: 'success',
    data: {
      message,
    },
  });
});

exports.getTicketMessages = catchAsync(async (req, res, next) => {
  const ticketId = req.params.ticketId;

  // Check if the ticket exists
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) {
    return next(new AppError('No ticket found with that ID', 404));
  }

  // Check if the user is allowed to access the ticket
  if (req.user.role !== 'Admin' && !ticket.userId.equals(req.user._id)) {
    return next(
      new AppError('You do not have permission to access this ticket', 403)
    );
  }

  const messages = await Message.find({ ticket: ticketId })
    .populate('userId', 'name avatar')
    .sort({
      createdAt: 1,
    });

  res.status(200).json({
    status: 'success',
    data: {
      messages,
    },
  });
});
