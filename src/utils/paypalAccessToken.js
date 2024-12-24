import axios from "axios";
import qs from "querystring";

const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET } = process.env;


async function generatePaypalAccessToken() {
  const url = "https://api-m.sandbox.paypal.com/v1/oauth2/token";

  try {
    console.log("PAYPAL_CLIENT_ID:", PAYPAL_CLIENT_ID);
    
    const response = await axios.post(
      url,
      qs.stringify({ grant_type: "client_credentials" }), // Request body
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString("base64")}`,
        },
      }
    );

    console.log("Access Token:", response.data.access_token);
    return response.data.access_token;
  } catch (error) {
    console.error(
      "Error generating access token:",
      error.response?.data || error.message
    );
  }
}

export default generatePaypalAccessToken;
