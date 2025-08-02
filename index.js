const express = require('express');
const axios = require('axios');
const app = express();
const port = process.env.PORT || 3000;

class Share {
  constructor(cookie, post, shareCount) {
    this.cookie = cookie;
    this.post = post;
    this.shareCount = shareCount;

    this.headers = {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'sec-ch-ua': '"Google Chrome";v="107", "Chromium";v="107", "Not=A?Brand";v="24"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': 'Windows',
      'sec-fetch-dest': 'document',
      'sec-fetch-mode': 'navigate',
      'sec-fetch-site': 'none',
      'sec-fetch-user': '?1',
      'upgrade-insecure-requests': '1',
      'cookie': cookie
    };
  }

  async getToken() {
    const res = await axios.get('https://business.facebook.com/content_management', {
      headers: this.headers,
    });
    const match = res.data.match(/EAAG(.*?)","/);
    if (!match) throw new Error('Token not found');
    return 'EAAG' + match[1];
  }

  async startBackgroundShare(token) {
    this.headers['accept-encoding'] = 'gzip, deflate';
    this.headers['host'] = 'b-graph.facebook.com';
    this.headers['cookie'] = this.cookie;

    for (let count = 1; count <= this.shareCount; count++) {
      try {
        const res = await axios.post(
          `https://b-graph.facebook.com/me/feed?link=${encodeURIComponent(this.post)}&published=0&access_token=${token}`,
          {},
          { headers: this.headers }
        );
        if (!res.data.id) throw new Error('Blocked or invalid response');
      } catch (err) {
        console.error(`❌ Share failed at #${count}: ${err.message}`);
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 8000)); // 8-second delay
    }

    console.log(`[✅] Done processing ${this.shareCount} shares.`);
  }
}

app.get('/share', async (req, res) => {
  const { cookie, link, amount } = req.query;

  if (!cookie || !link || !amount || !link.startsWith('http')) {
    return res.status(400).json({ error: 'Invalid input', author: 'churchilli' });
  }

  const share = new Share(cookie, link, parseInt(amount, 10));

  try {
    const token = await share.getToken();

    setImmediate(() => {
      share.startBackgroundShare(token);
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
    setImmediate(async () => {
      await share.startBackgroundShare(token);
    });

    res.json({ message: 'Sharing started', author: 'churchilli' });
  } catch (err) {
    res.status(500).json({ error: err.message, author: 'churchilli' });
  }
});

app.listen(port, () => {
  console.log(`API running on port ${port}`);
});
