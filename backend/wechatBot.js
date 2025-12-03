const https = require('https');

/**
 * 企业微信群机器人消息推送工具类
 */
class WechatBot {
  /**
   * 构造函数
   * @param {string} webhookUrl - 企业微信群机器人的 Webhook 地址
   */
  constructor(webhookUrl) {
    if (!webhookUrl) {
      throw new Error('Webhook URL is required');
    }
    this.webhookUrl = webhookUrl;
  }

  /**
   * 发送文本消息
   * @param {string} content - 消息内容
   * @param {Array<string>} mentionedList - @的用户列表（userid）
   * @param {Array<string>} mentionedMobileList - @的用户手机号列表
   * @returns {Promise<Object>} 返回发送结果
   */
  async sendText(content, mentionedList = [], mentionedMobileList = []) {
    const data = {
      msgtype: 'text',
      text: {
        content: content,
        mentioned_list: mentionedList,
        mentioned_mobile_list: mentionedMobileList
      }
    };
    return this._sendRequest(data);
  }

  /**
   * 发送 Markdown 消息
   * @param {string} content - Markdown 格式的消息内容
   * @returns {Promise<Object>} 返回发送结果
   */
  async sendMarkdown(content) {
    const data = {
      msgtype: 'markdown',
      markdown: {
        content: content
      }
    };
    return this._sendRequest(data);
  }

  /**
   * 发送预约通知消息
   * @param {Object} bookingInfo - 预约信息
   * @param {number} bookingInfo.orderNumber - 订单号
   * @param {string} bookingInfo.projectName - 项目名称
   * @param {string} bookingInfo.phone - 联系电话
   * @param {string} bookingInfo.message - 留言信息
   * @param {string} bookingInfo.submitTime - 提交时间
   * @param {boolean} mentionAll - 是否@所有人
   * @returns {Promise<Object>} 返回发送结果
   */
  async sendBookingNotification(bookingInfo, mentionAll = true) {
    const { orderNumber, projectName, phone, message, submitTime } = bookingInfo;
    
    // 构建消息内容
    let content = `【今日第 ${orderNumber} 单】\n`;
    content += `项目：${projectName}\n`;
    content += `电话：${phone}\n`;
    content += `留言：${message}\n`;
    content += `\n提交时间：${submitTime}`;
    
    // 如果需要@所有人
    const mentionedList = mentionAll ? ['@all'] : [];
    
    return this.sendText(content, mentionedList);
  }

  /**
   * 发送图文消息
   * @param {Array<Object>} articles - 图文列表
   * @returns {Promise<Object>} 返回发送结果
   */
  async sendNews(articles) {
    const data = {
      msgtype: 'news',
      news: {
        articles: articles
      }
    };
    return this._sendRequest(data);
  }

  /**
   * 发送图片消息
   * @param {string} base64 - 图片的base64编码
   * @param {string} md5 - 图片的md5值
   * @returns {Promise<Object>} 返回发送结果
   */
  async sendImage(base64, md5) {
    const data = {
      msgtype: 'image',
      image: {
        base64: base64,
        md5: md5
      }
    };
    return this._sendRequest(data);
  }

  /**
   * 内部方法：发送 HTTPS 请求
   * @param {Object} data - 要发送的数据
   * @returns {Promise<Object>} 返回响应结果
   */
  _sendRequest(data) {
    return new Promise((resolve, reject) => {
      const url = new URL(this.webhookUrl);
      const postData = JSON.stringify(data);

      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          try {
            const result = JSON.parse(responseData);
            if (result.errcode === 0) {
              resolve({ success: true, data: result });
            } else {
              reject(new Error(`企业微信API错误: ${result.errmsg} (errcode: ${result.errcode})`));
            }
          } catch (error) {
            reject(new Error(`解析响应失败: ${error.message}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`请求失败: ${error.message}`));
      });

      req.write(postData);
      req.end();
    });
  }
}

module.exports = WechatBot;
