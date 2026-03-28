/**
 * Smart File Upload – AWS Lambda Function
 * Runtime: Node.js 18+ (ESM)
 *
 * AWS SDK v3 is bundled in the Node.js 18 Lambda runtime — no npm install needed.
 *
 * Deploy this file to AWS Lambda and configure:
 *  - IAM Role: AmazonS3FullAccess (or scoped to your bucket)
 *  - API Gateway: GET /get-upload-url → this Lambda
 *  - Environment variable: BUCKET_NAME=smart-upload-bucket
 */

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({});
const BUCKET = process.env.BUCKET_NAME || "smart-upload-bucket";

export const handler = async (event) => {
  // Handle CORS preflight (OPTIONS) requests
  if (
    event.httpMethod === "OPTIONS" ||
    event.requestContext?.http?.method === "OPTIONS"
  ) {
    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: "",
    };
  }

  try {
    const fileName = event.queryStringParameters?.name;

    if (!fileName) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({ message: "Missing required query param: name" }),
      };
    }

    // Sanitise the key – strip directory traversal characters
    const sanitised = fileName.replace(/[^a-zA-Z0-9._\-()\s]/g, "_");
    const key = `uploads/${Date.now()}-${sanitised}`;

    // SDK v3: create a command, then sign it (async)
    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: "application/octet-stream",
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 60 });

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
