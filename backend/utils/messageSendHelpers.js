const mongoose = require('mongoose');
const User = require('../models/User');

const DEFAULT_SELF_DESTRUCT_SECONDS = Number(process.env.SELF_DESTRUCT_TIMER) || 10;

const normalizeReplyToId = (replyTo) => {
  if (!replyTo) return null;
  if (typeof replyTo === 'string' && mongoose.Types.ObjectId.isValid(replyTo)) return replyTo;
  if (typeof replyTo === 'object') {
    const id = replyTo._id || replyTo.id;
    if (id && mongoose.Types.ObjectId.isValid(String(id))) return String(id);
  }
  return null;
};

const getSelfDestructExpiry = ({ isSelfDestruct, selfDestructTimer } = {}) => {
  if (!isSelfDestruct) return null;
  const seconds = selfDestructTimer != null && !Number.isNaN(Number(selfDestructTimer))
    ? Math.max(1, Number(selfDestructTimer))
    : DEFAULT_SELF_DESTRUCT_SECONDS;
  return new Date(Date.now() + seconds * 1000);
};

const isEitherUserBlocked = async (userIdA, userIdB) => {
  if (!userIdA || !userIdB) return false;
  const users = await User.find({ _id: { $in: [userIdA, userIdB] } }).select('blockedUsers').lean();
  const a = users.find((u) => String(u._id) === String(userIdA));
  const b = users.find((u) => String(u._id) === String(userIdB));
  const aBlocked = (a?.blockedUsers || []).some((id) => String(id) === String(userIdB));
  const bBlocked = (b?.blockedUsers || []).some((id) => String(id) === String(userIdA));
  return aBlocked || bBlocked;
};

const isConversationBlocked = async (conversation, senderId) => {
  if (!conversation?.participants?.length) return false;
  const sender = String(senderId);
  const others = conversation.participants
    .map((p) => String(p?._id || p))
    .filter((id) => id && id !== sender);
  for (const otherId of others) {
    if (await isEitherUserBlocked(sender, otherId)) return true;
  }
  return false;
};

module.exports = {
  DEFAULT_SELF_DESTRUCT_SECONDS,
  normalizeReplyToId,
  getSelfDestructExpiry,
  isEitherUserBlocked,
  isConversationBlocked
};
