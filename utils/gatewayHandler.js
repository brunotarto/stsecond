const axios = require('axios');

async function sendToGateway(method, params) {
  try {
    const response = await axios.post(
      `${process.env.API_BASE_URL}/${params.network.toLowerCase()}/.${method}`,
      {
        ...params,
        key: process.env.API_KEY,
      }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
}

module.exports = sendToGateway;
