const axios = require('axios');

module.exports = async (method, params) => {
  const response = await axios.post(
    `${process.env.API_BASE_URL}/${params.network.toLowerCase()}/.${method}`,
    {
      ...params,
      key: process.env.API_KEY,
    }
  );
  return response.data;
};
