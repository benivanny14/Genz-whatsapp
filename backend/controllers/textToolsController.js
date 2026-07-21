// Text Tools controller - Capitalize, Stylish/Unicode, Blank messages, Text Repeater
const User = require('../models/User');

const LOCAL_USER_ID = process.env.LOCAL_USER_ID || '60d5ecb8b392cb371c664c12';
const getCurrentUserId = (req) => req.user?._id?.toString() || LOCAL_USER_ID;

// Stylish fonts map (Unicode transformations for WhatsApp-style text formatting)
const STYLES = {
  bold: { map: '𝐀𝐁𝐂𝐃𝐄𝐅𝐆𝐇𝐈𝐉𝐊𝐋𝐌𝐍𝐎𝐏𝐐𝐑𝐒𝐓𝐔𝐕𝐖𝐗𝐘𝐙𝐚𝐛𝐜𝐝𝐞𝐟𝐠𝐡𝐢𝐣𝐤𝐥𝐦𝐧𝐨𝐩𝐪𝐫𝐬𝐭𝐮𝐯𝐰𝐱𝐲𝐳𝟎𝟏𝟐𝟑𝟒𝟓𝟔𝟕𝟖𝟗', range: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789' },
  italic: { map: '𝐴𝐵𝐶𝐷𝐸𝐹𝐺𝐻𝐼𝐽𝐾𝐿𝑀𝑁𝑂𝑃𝑄𝑅𝑆𝑇𝑈𝑉𝑊𝑋𝑌𝑍𝑎𝑏𝑐𝑑𝑒𝑓𝑔ℎ𝑖𝑗𝑘𝑙𝑚𝑛𝑜𝑝𝑞𝑟𝑠𝑡𝑢𝑣𝑤𝑥𝑦𝑧', range: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz' },
  script: { map: '𝒜ℬ𝒞𝒟ℰℱ𝒢ℋℐ𝒥𝒦ℒℳ𝒩𝒪𝒫𝒬ℛ𝒮𝒯𝒰𝒱𝒲𝒳𝒴𝒵𝒶𝒷𝒸𝒹ℯ𝒻ℊ𝒽𝒾𝒿𝓀𝓁𝓂𝓃ℴ𝓅𝓆𝓇𝓈𝓉𝓊𝓋𝓌𝓍𝓎𝓏', range: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz' },
  monospace: { map: '𝙰𝙱𝙲𝙳𝙴𝙵𝙶𝙷𝙸𝙹𝙺𝙻𝙼𝙽𝙾𝙿𝚀𝚁𝚂𝚃𝚄𝚅𝚆𝚇𝚈𝚉𝚊𝚋𝚌𝚍𝚎𝚏𝚐𝚑𝚒𝚓𝚔𝚕𝚖𝚗𝚘𝚙𝚚𝚛𝚜𝚝𝚞𝚟𝚠𝚡𝚢𝚣', range: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz' },
  bubble: { map: 'ⓐⓑⓒⓓⓔⓕⓖⓗⓘⓙⓚⓛⓜⓝⓞⓟⓠⓡⓢⓣⓤⓥⓦⓧⓨⓩ', range: 'abcdefghijklmnopqrstuvwxyz' },
  gothic: { map: '𝔄𝔅ℭ𝔇𝔈𝔉𝔊ℌℑ𝔍𝔎𝔏𝔐𝔑𝔒𝔓𝔔ℜ𝔖𝔗𝔘𝔙𝔚𝔛𝔜𝔷𝔞𝔟𝔠𝔡𝔢𝔣𝔤𝔥𝔦𝔧𝔨𝔩𝔪𝔫𝔬𝔭𝔮𝔯𝔰𝔱𝔲𝔳𝔴𝔵𝔶𝔷', range: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz' },
};

const applyStyle = (text, styleName) => {
  const style = STYLES[styleName];
  if (!style || !text) return text;
  let result = '';
  for (const char of text) {
    const idx = style.range.indexOf(char);
    result += idx !== -1 ? style.map[idx] : char;
  }
  return result;
};

// POST /api/text-tools/uppercase
exports.toUpperCase = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.json({ success: true, result: '' });
    res.json({ success: true, result: String(text).toUpperCase() });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// POST /api/text-tools/capitalize
exports.capitalize = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.json({ success: true, result: '' });
    res.json({ success: true, result: String(text).charAt(0).toUpperCase() + String(text).slice(1) });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// POST /api/text-tools/stylish - Apply Unicode style
exports.toStylish = async (req, res) => {
  try {
    const { text, style } = req.body;
    if (!text) return res.json({ success: true, result: '' });
    const styleName = style || 'bold';
    const result = applyStyle(String(text), styleName);
    res.json({ success: true, result, style: styleName });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// POST /api/text-tools/repeat - Text repeater
exports.repeatText = async (req, res) => {
  try {
    const { text, count } = req.body;
    if (!text) return res.json({ success: true, result: '' });
    const repeatCount = Math.min(Math.max(1, Number(count) || 1), 100);
    res.json({ success: true, result: text.repeat(repeatCount) });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// POST /api/text-tools/blank - Generate blank/invisible message
exports.blankMessage = async (req, res) => {
  try {
    const { spaces } = req.body;
    const count = Math.min(Math.max(1, Number(spaces) || 1), 50);
    // Use zero-width space or regular spaces
    const blank = '\u200B'.repeat(count * 10); // Zero-width space - invisible
    res.json({ success: true, result: blank });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// GET /api/text-tools/styles - List available styles
exports.getStyles = async (req, res) => {
  try {
    const styleList = Object.keys(STYLES).map(k => ({
      id: k,
      name: k.charAt(0).toUpperCase() + k.slice(1),
      preview: applyStyle('Hello World', k),
    }));
    res.json({ success: true, styles: styleList });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

module.exports = exports;
