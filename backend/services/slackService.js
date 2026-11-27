const axios = require('axios');
const { toSlackMrkdwn } = require('./reportService');

/** Post a Markdown report to a Slack incoming webhook (URL already validated on save). */
const postToSlack = (webhookUrl, title, markdown) =>
  axios.post(webhookUrl, { text: `*${title}*\n\n${toSlackMrkdwn(markdown)}`, unfurl_links: false }, { timeout: 10000 });

module.exports = { postToSlack };
