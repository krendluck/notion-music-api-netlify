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

    // 获取数据库名称用于日志
    const databaseName = databaseInfo.title[0]?.plain_text || "音乐数据库";
    console.log(`数据库名称: ${databaseName}`);

    // 构建查询
    const queryParams = {
      database_id: process.env.NOTION_DATABASE_ID,
      page_size: 100 // 每页最大记录数
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
    
    // 使用分页获取所有记录
    let allResults = [];
    let hasMore = true;
    let nextCursor = undefined;
    
    while (hasMore) {
      if (nextCursor) {
        queryParams.start_cursor = nextCursor;
      }
      
      console.log(`执行Notion查询，${nextCursor ? '游标: ' + nextCursor : '首页'}`);
      try {
        const response = await notion.databases.query(queryParams);
        
        allResults = allResults.concat(response.results);
        console.log(`已获取记录总数: ${allResults.length}`);
        
        if (response.has_more && response.next_cursor) {
          nextCursor = response.next_cursor;
        } else {
          hasMore = false;
        }
      } catch (error) {
        console.error("Notion API查询错误:", error);
        hasMore = false; // 停止循环以防止无限循环
      }
    }
    
    console.log(`查询结果: ${allResults.length}条记录`);
    
    // 构建歌曲列表
    const songs = [];
    for(const result of allResults) {
      try {
        const song = result.properties.Song.title[0]?.text?.content;
        const songUrl = result.properties.SongFile.files[0]?.external?.url || 
                     result.properties.SongFile.files[0]?.file?.url;
        const lrcUrl = result.properties.LyricFile?.files[0]?.external?.url ||
                     result.properties.LyricFile?.files[0]?.file?.url;
        const artist = result.properties.Artist?.rich_text[0]?.plain_text || "未知歌手";
        
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
      playlistName = databaseName; // 使用数据库名称作为默认播放列表名
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        name: playlistName,
        artist: databaseName,
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
