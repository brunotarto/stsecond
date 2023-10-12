/**
 * APIFeatures class - provides a convenient way to build Mongoose queries
 * based on query parameters provided in the request
 */
module.exports = class APIFeatures {
  /**
   * Create a new instance of APIFeatures
   * @param {object} query - a Mongoose Query object
   * @param {object} queryString - an object that contains query parameters passed in the request
   */
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  /**
   * Apply filtering to the query based on the query parameters
   * @returns {APIFeatures} - the APIFeatures instance
   */
  filter() {
    // Create a copy of the queryString object
    const queryObj = { ...this.queryString };
    // Define an array of excluded fields
    const excludedFields = [
      'page',
      'sort',
      'limit',
      'fields',
      'startDate',
      'endDate',
    ];
    // Remove excluded fields from the query object
    excludedFields.forEach((field) => delete queryObj[field]);

    // Remove query parameters with empty values
    Object.keys(queryObj).forEach((key) => {
      if (queryObj[key] === '') {
        delete queryObj[key];
      }
    });

    // Apply the remaining query parameters to the query object
    this.query = this.query.find(queryObj);
    return this;
  }
  /**
   * Apply sorting to the query based on the sort parameter
   * @returns {APIFeatures} - the APIFeatures instance
   */
  sort() {
    // Set a default value for the sort parameter if it's not already specified
    this.queryString.sort = this.queryString.sort ?? '-createdAt';
    // Apply the sort parameter to the query object
    this.query = this.query.sort(this.queryString.sort);
    return this;
  }

  /**
   * Limit the fields returned by the query based on the fields parameter
   * @returns {APIFeatures} - the APIFeatures instance
   */
  field() {
    // Set a default value for the fields parameter if it's not already specified
    const fields = this.queryString.fields
      ? this.queryString.fields.split(',').join(' ')
      : '-__v';
    // Create an options object for the select method
    const options = {
      select: fields,
    };
    // Apply the select method with the options object to the query object
    this.query = this.query.select(options.select);
    return this;
  }

  /**
   * Skip a number of documents based on the page and limit parameters
   * @returns {APIFeatures} - the APIFeatures instance
   */
  skip() {
    if (this.queryString.limit === '-1') return this;
    // Set default values for the page and limit parameters
    const page = parseInt(this.queryString.page, 10) || 1;
    const limit = parseInt(this.queryString.limit, 10) || 100;

    // Calculate the number of documents to skip based on the page and limit parameters
    const skip = (page - 1) * limit;
    // Apply the skip and limit methods to the query object
    this.query = this.query.skip(skip).limit(limit);
    return this;
  }

  /**
   * Limit the number of documents returned by the query based on the limit parameter
   * @returns {APIFeatures} - the APIFeatures instance
   */
  limit() {
    // Set a default value for the limit parameter if it's not already specified
    const limit = +this.queryString.limit || 100;
    // Apply the limit method to the query object
    this.query = this.query.limit(limit);
    return this;
  }

  /**
   * Filter the query based on a date range for the createdAt field
   * @returns {APIFeatures} - the APIFeatures instance
   */
  dateRange() {
    const { startDate, endDate } = this.queryString;

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      this.query = this.query.find({
        createdAt: {
          $gte: start,
          $lte: end,
        },
      });
    }

    return this;
  }
};
