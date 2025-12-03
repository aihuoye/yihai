/**
 * 企业微信群消息推送测试示例
 * 
 * 使用前请先：
 * 1. 在企业微信群中添加机器人，获取 Webhook 地址
 * 2. 将下面的 WEBHOOK_URL 替换为你的实际地址
 * 3. 运行: node test-wechat-bot.js
 */

const WechatBot = require('./wechatBot');

// 替换为你的企业微信群机器人 Webhook 地址
const WEBHOOK_URL = 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=YOUR_KEY_HERE';

// 测试函数
async function testWechatBot() {
  try {
    console.log('开始测试企业微信群消息推送...\n');
    
    // 创建机器人实例
    const bot = new WechatBot(WEBHOOK_URL);
    
    // 测试1: 发送预约通知消息
    console.log('测试1: 发送预约通知消息');
    const bookingResult = await bot.sendBookingNotification({
      orderNumber: 7,
      projectName: '衡阳肤康皮肤病医院',
      phone: '18684039042',
      message: '授权号码',
      submitTime: '2025-12-03 14:05:49'
    }, true);
    console.log('✓ 预约通知发送成功:', bookingResult);
    console.log('');
    
    // 等待2秒，避免频率限制
    await sleep(2000);
    
    // 测试2: 发送普通文本消息
    console.log('测试2: 发送普通文本消息');
    const textResult = await bot.sendText('这是一条测试消息，来自企业微信群消息推送工具');
    console.log('✓ 文本消息发送成功:', textResult);
    console.log('');
    
    // 等待2秒
    await sleep(2000);
    
    // 测试3: 发送带@的文本消息
    console.log('测试3: 发送带@所有人的文本消息');
    const mentionResult = await bot.sendText('重要通知：系统将于今晚22:00进行维护', ['@all']);
    console.log('✓ @所有人消息发送成功:', mentionResult);
    console.log('');
    
    // 等待2秒
    await sleep(2000);
    
    // 测试4: 发送 Markdown 消息
    console.log('测试4: 发送 Markdown 消息');
    const markdownContent = `
# 系统通知

## 新功能上线

我们很高兴地宣布以下新功能已上线：

- **预约管理系统**：支持在线预约和管理
- **医生团队展示**：查看医生详细信息
- **消息推送**：实时接收预约通知

> 如有问题，请联系技术支持

**发布时间**：2025-12-03
    `.trim();
    
    const markdownResult = await bot.sendMarkdown(markdownContent);
    console.log('✓ Markdown消息发送成功:', markdownResult);
    console.log('');
    
    console.log('所有测试完成！✓');
    
  } catch (error) {
    console.error('测试失败:', error.message);
    console.error('错误详情:', error);
  }
}

// 辅助函数：延迟执行
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 测试通过 HTTP API 发送消息
async function testHttpApi() {
  const axios = require('axios');
  const API_BASE_URL = 'http://localhost:4000';
  
  try {
    console.log('\n\n开始测试 HTTP API...\n');
    
    // 测试预约通知接口
    console.log('测试: POST /api/wechat/send-booking-notification');
    const response = await axios.post(`${API_BASE_URL}/api/wechat/send-booking-notification`, {
      webhookUrl: WEBHOOK_URL,
      orderNumber: 8,
      projectName: '衡阳肤康皮肤病医院',
      phone: '13511134894',
      message: '授权号码',
      submitTime: '2025-12-03 14:44:35',
      mentionAll: true
    });
    
    console.log('✓ API 调用成功:', response.data);
    console.log('');
    
  } catch (error) {
    console.error('API 测试失败:', error.response?.data || error.message);
  }
}

// 主函数
async function main() {
  // 检查是否配置了 Webhook URL
  if (WEBHOOK_URL === 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=YOUR_KEY_HERE') {
    console.error('错误: 请先配置 WEBHOOK_URL');
    console.log('请在企业微信群中添加机器人，获取 Webhook 地址后替换 WEBHOOK_URL 变量');
    return;
  }
  
  // 运行测试
  await testWechatBot();
  
  // 如果需要测试 HTTP API，取消下面的注释
  // await testHttpApi();
}

// 执行测试
main();
