const { Client } = require("@notionhq/client");

// 初始化Notion客户端
const notion = new Client({
  auth: process.env.NOTION_API_KEY
});

exports.handler = async function(event, context) {
  // 设置CORS头
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "X-Requested-With, Content-Type, Authorization",
    "Content-Type": "application/json"
  };
  
  // 处理预检请求
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  // 只接受POST请求
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "方法不允许" })
    };
  }

  try {
    const requestData = JSON.parse(event.body);
    const { songId, errorType, url } = requestData;
    
    // 检查必要参数
    if (!songId || !errorType) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "缺少必要参数" })
      };
    }
    
    // 实现更新逻辑...
    // 此处根据您原来的update.js实现
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        updatedUrl: "更新后的链接URL"
      })
    };
  } catch (error) {
    console.error("更新失败:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: '更新失败',
        message: error.message
      })
    };
  }
};