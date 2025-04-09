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
    "Access-Control-Max-Age": "86400",
    "Content-Type": "application/json"
  };
  
  // 处理预检请求
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    console.log("API调用开始");
    
    // 获取查询参数
    const { tag, search } = event.queryStringParameters || {};
    console.log("查询参数:", { tag, search });
    
    // 首先获取数据库元数据以获取数据库名称（作为歌手名）
    console.log("获取数据库元数据...");
    const databaseInfo = await notion.databases.retrieve({
      database_id: process.env.NOTION_DATABASE_ID
    });

    // 从数据库标题中提取歌手名称
    const artist = databaseInfo.title[0]?.plain_text || "未知歌手";
    console.log(`数据库名称 (歌手): ${artist}`);

    // 构建查询
    const queryParams = {
      database_id: process.env.NOTION_DATABASE_ID
    };
    
    // 添加过滤条件
    if (tag) {
      queryParams.filter = {
        property: 'Tags',
        multi_select: {
          contains: tag
        }
      };
    }
    
    if (search) {
      queryParams.filter = {
        or: [
          {
            property: 'Song',
            title: {
              contains: search
            }
          },
          {
            property: 'Artist',
            rich_text: {
              contains: search
            }
          }
        ]
      };
    }
    
    console.log("执行Notion查询...");
    const results = await notion.databases.query(queryParams);
    console.log(`查询结果: ${results.results.length}条记录`);
    
    // 构建歌曲列表
    const songs = [];
    for(const result of results.results) {
      try {
        const song = result.properties.Song.title[0]?.text?.content;
        const songUrl = result.properties.SongFile.files[0]?.external?.url || 
                     result.properties.SongFile.files[0]?.file?.url;
        const lrcUrl = result.properties.LyricFile?.files[0]?.external?.url ||
                     result.properties.LyricFile?.files[0]?.file?.url;
        
        if(song && songUrl) {
          songs.push({
            title: song,
            artist: artist,
            url: songUrl,
            lrc: lrcUrl || null,
            id: result.id  // 保存ID以便更新功能
          });
          console.log(`处理歌曲: ${song}`);
        }
      } catch (error) {
        console.error("处理单条记录错误:", error);
      }
    }
    
    console.log(`成功处理 ${songs.length} 首歌曲`);

    // 确定合适的播放列表名称
    let playlistName = 'Notion音乐库';
    if (search) {
      playlistName = `搜索: ${search}`;
    } else if (tag) {
      playlistName = `分类: ${tag}`;
    } else {
      playlistName = artist; // 使用歌手名作为默认播放列表名
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        name: playlistName,
        artist: artist,
        songs: songs
      })
    };
  } catch (error) {
    console.error("API错误:", error);
    return {
      statusCode: 500,
      headers, 
      body: JSON.stringify({ 
        error: '获取Notion数据失败',
        message: error.message
      })
    };
  }
};