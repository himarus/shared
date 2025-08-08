const express = require('express');
const axios = require('axios');
const app = express();
const port = process.env.PORT || 3000;

class Share {
  constructor(cookies, post, shareCount, proxies) {
    this.cookies = Array.isArray(cookies) ? cookies : [cookies];
    this.post = post;
    this.shareCount = shareCount;
    this.proxies = proxies || [];
    this.uaList = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      'Mozilla/5.0 (Linux; Android 10; Mobile)',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
      'Mozilla/5.0 (Linux; Android 11; SM-G973F)'
    ];
    this.tokens = {};
  }

  randomUA() {
    return this.uaList[Math.floor(Math.random() * this.uaList.length)];
  }

  randomCookie() {
    return this.cookies[Math.floor(Math.random() * this.cookies.length)];
  }

  randomProxy() {
    return this.proxies.length ? this.proxies[Math.floor(Math.random() * this.proxies.length)] : null;
  }

  async getToken(cookie) {
    if (this.tokens[cookie]) return this.tokens[cookie];
    const headers = {
      'user-agent': this.randomUA(),
      'cookie': cookie
    };
    const res = await axios.get('https://business.facebook.com/content_management', { headers });
    const match = res.data.match(/EAAG(.*?)","/);
    if (!match) throw new Error('Token not found');
    const token = 'EAAG' + match[1];
    this.tokens[cookie] = token;
    return token;
  }

  async shareOnce(cookie, token, count) {
    const proxy = this.randomProxy();
    const config = {
      headers: {
        'user-agent': this.randomUA(),
        'cookie': cookie,
        'accept-encoding': 'gzip, deflate',
        'host': 'b-graph.facebook.com'
      }
    };
    if (proxy) {
      config.proxy = {
        host: proxy.split(':')[0],
        port: parseInt(proxy.split(':')[1])
      };
    }
    try {
      const res = await axios.post(
        `https://b-graph.facebook.com/me/feed?link=${encodeURIComponent(this.post)}&published=0&access_token=${token}`,
        {},
        config
      );
      if (!res.data.id) throw new Error('Blocked or invalid response');
      console.log(`✅ Share #${count} success`);
    } catch (err) {
      console.error(`❌ Share failed at #${count}: ${err.message}`);
      await new Promise(r => setTimeout(r, 2000));
      return this.shareOnce(cookie, token, count);
    }
  }

  async startBackgroundShare() {
    const batchSize = 5;
    let current = 0;
    while (current < this.shareCount) {
      const batch = [];
      for (let i = 0; i < batchSize && current < this.shareCount; i++) {
        current++;
        const cookie = this.randomCookie();
        batch.push(
          (async () => {
            const token = await this.getToken(cookie);
            await new Promise(r => setTimeout(r, Math.floor(Math.random() * 2000) + 1000));
            await this.shareOnce(cookie, token, current);
          })()
        );
      }
      await Promise.all(batch);
    }
    console.log(`[✅] Done processing ${this.shareCount} shares.`);
  }
}

app.get('/share', async (req, res) => {
  let { cookies, link, amount, proxies } = req.query;
  if (!cookies || !link || !amount || !link.startsWith('http')) {
    return res.status(400).json({ error: 'Invalid input', author: 'churchilli' });
  }
  cookies = cookies.includes(',') ? cookies.split(',') : [cookies];
  proxies = proxies ? (proxies.includes(',') ? proxies.split(',') : [proxies]) : [];
  const share = new Share(cookies, link, parseInt(amount, 10), proxies);
  try {
    setImmediate(() => {
      share.startBackgroundShare();
    });
    res.json({
      message: `Sharing process started for ${amount} shares. This will run in background.`,
      author: 'churchilli'
    });
  } catch (err) {
    res.status(500).json({ error: err.message, author: 'churchilli' });
  }
});

app.listen(port, () => {
  console.log(`🔥 API running on port ${port}`);
});
