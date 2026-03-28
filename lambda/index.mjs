/**
 * Smart File Upload – AWS Lambda Function
 * Runtime: Node.js 18+ (ESM)
 *
 * Deploy this file to AWS Lambda and configure:
 *  - IAM Role: AmazonS3FullAccess (or scoped to your bucket)
 *  - API Gateway: GET /get-upload-url → this Lambda
 *  - Environment variable: BUCKET_NAME=smart-upload-bucket
 *
 * API Gateway must have CORS enabled for your frontend origin.
 */

import AWS from "aws-sdk";

const s3 = new AWS.S3();
const BUCKET = process.env.BUCKET_NAME || "smart-upload-bucket";

export const handler = async (event) => {
  try {
    const fileName = event.queryStringParameters?.name;

    if (!fileName) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({ message: "Missing required query param: name" }),
      };
    }

    // Sanitise the key – strip directory traversal
    const sanitised = fileName.replace(/[^a-zA-Z0-9._\-() ]/g, "_");
    const key = `uploads/${Date.now()}-${sanitised}`;

    const params = {
      Bucket: BUCKET,
      Key: key,
      Expires: 60,                           // URL valid for 60 seconds
      ContentType: "application/octet-stream",
    };

    const uploadUrl = s3.getSignedUrl("putObject", params);

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({ uploadUrl }),
    };
  } catch (err) {
    console.error("Lambda error:", err);
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ message: "Internal server error", error: err.message }),
    };
  }
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };
}
