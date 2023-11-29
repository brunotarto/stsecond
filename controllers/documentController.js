const multer = require('multer');
const Document = require('../models/documentModel');
const User = require('../models/userModel');
const mongoose = require('mongoose');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

const mindee = require('mindee');
const fs = require('fs');
const path = require('path');
// Initialize Mindee client with your API key
const mindeeClient = new mindee.Client({
  apiKey: process.env.MINDEE_API_KEY,
});

const simplifyPredictions = (predictions) => {
  const simplified = {};
  for (const key of Object.keys(predictions)) {
    const field = predictions[key];

    // Check if the field is an array (like 'givenNames') and extract the first item's value
    if (Array.isArray(field)) {
      simplified[key] = field.length > 0 ? field[0].value : null;
    }
    // Check if the field is an object and has a 'value' key (like 'birthDate')
    else if (field && typeof field === 'object' && 'value' in field) {
      simplified[key] = field.value;
    }
    // Otherwise, just copy the value
    else {
      simplified[key] = field;
    }
  }
  return simplified;
};

// Storage engine that doesn't store files to disk but keeps in memory
const storage = multer.memoryStorage();

// Set multer storage engine to the storage
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image')) {
      cb(new AppError('Not an image! Please upload only images.', 400), false);
    } else {
      cb(null, true);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB file size limit
});

exports.uploadUserDocument = upload.single('document');

exports.verifyDocument = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('No document provided!', 400));
  }

  try {
    const user = await User.findById(req.user._id);

    if (user.isVerified) {
      return next(new AppError('User is already verified', 400));
    }
    // Since multer is storing the file in memory, you'll need to write it to a temporary path
    // or adjust your multer configuration to not use memory storage.
    const tempPath = path.join(__dirname, req.file.originalname);
    fs.writeFileSync(tempPath, req.file.buffer);

    // Load the passport image or PDF file
    const inputSource = mindeeClient.docFromPath(tempPath);

    // Extract the ID document information
    const apiResponse = await mindeeClient.parse(
      mindee.product.PassportV1,
      inputSource
    );

    // Make sure to delete the temp file after the upload
    fs.unlinkSync(tempPath);

    // Get the extracted ID document information
    const document = apiResponse.document;

    const idNumber = document.inference.prediction.idNumber.value;

    const documentSameIdNumber = await Document.findOne({ idNumber });

    if (documentSameIdNumber) {
      return next(new AppError('This document already used ', 400));
    }

    // if (
    //   process.env.NODE_ENV !== 'development' &&
    //   new Date(document.inference.prediction.expiryDate.value) < new Date()
    // ) {
    //   return next(
    //     new AppError('Error verifying document, document expired', 400)
    //   );
    // } FIX

    req.document = simplifyPredictions(document.inference.prediction);

    if (
      !document.inference.prediction.mrz1.value ||
      !document.inference.prediction.mrz2.value
    ) {
      return next(new AppError('Error verifying document', 400));
    }
    next();
  } catch (error) {
    // Handle errors here
    console.error('Error verifying document with Mindee:', error);
    return next(new AppError('Error verifying document', 500));
  }
});

const { Readable } = require('stream');

exports.createDocument = catchAsync(async (req, res, next) => {
  const gfs = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: 'images',
  });

  // Convert buffer to ReadableStream to store in GridFS
  const readablePhotoStream = new Readable();
  readablePhotoStream.push(req.file.buffer);
  readablePhotoStream.push(null); // No more data

  const uploadStream = gfs.openUploadStream(`file_${Date.now()}`);
  const documentPath = uploadStream.id;

  readablePhotoStream.pipe(uploadStream);

  uploadStream.on('error', (error) => {
    return next(new AppError('Problem storing document', 500));
  });

  uploadStream.on('finish', async () => {
    try {
      const validateData = {
        givenNames: req.document.givenNames,
        surname: req.document.surname,
        birthDate: req.document.birthDate,
        country: req.document.country,
        expiryDate: req.document.expiryDate,
        gender: req.document.gender,
        idNumber: req.document.idNumber,
      };

      // Create the document in MongoDB
      await Document.create({
        userId: req.user._id,
        documentPath: documentPath.toString(), // Ensure this is a string
        ...validateData,
      });

      await User.findByIdAndUpdate(
        req.user._id,
        {
          isVerified: true,
        },
        { validateBeforeSave: false, new: true }
      );

      const data = req.document;
      // Respond with the verified document data
      res.status(201).json({
        status: 'success',
        data,
      });
    } catch (error) {
      next(new AppError('Error creating document entry', 500));
    }
  });
});

exports.getVerificationStatus = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const user = await User.findById(req.user._id);

  if (!user.isVerified) {
    return res.status(201).json({
      status: 'success',
      data: {
        isVerified: false,
      },
    });
  }

  const document = await Document.findOne({ userId });
  document.documentPath = null;
  res.status(201).json({
    status: 'success',
    data: {
      isVerified: true,
      document,
    },
  });
});

// Add a utility function to retrieve the file using GridFSBucket
exports.getDocument = catchAsync(async (req, res, next) => {
  // Find the document by ID
  const userId = req.params.userId;
  const document = await Document.findOne({ userId: userId });

  // If the document is not found, throw an error
  if (!document) {
    throw new AppError('No document found with that ID', 404);
  }
  const fileObjectId = new mongoose.Types.ObjectId(document.documentPath);
  // Instantiate the GridFSBucket with the current mongoose connection
  const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: 'images',
  });

  // Open a download stream for the file
  const stream = bucket.openDownloadStream(fileObjectId);

  // Pipe the stream to the response
  stream.pipe(res);

  // Handle errors
  stream.on('error', (error) => {
    console.error('Stream Error:', error);
    return next(new AppError('Error streaming file', 500));
  });

  // Once the stream is finished, you might want to end the response if it doesn't automatically
  stream.on('end', () => {
    res.end();
  });
});

exports.getDocumentData = catchAsync(async (req, res, next) => {
  // Find the document by ID
  const userId = req.params.userId;
  const document = await Document.findOne({ userId: userId });
  if (!document) {
    throw new AppError('No document found with that ID', 404);
  }

  res.status(201).json({
    status: 'success',
    data: {
      document,
    },
  });
});
