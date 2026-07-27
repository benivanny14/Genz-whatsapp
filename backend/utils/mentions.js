const mongoose = require('mongoose');
const User = require('../models/User');

const escapeRegExp = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeId = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (mongoose.Types.ObjectId.isValid(value)) return String(value);
  if (value._id && value._id !== value) return normalizeId(value._id);
  if (value.id && value.id !== value) return normalizeId(value.id);
  if (typeof value.toString === 'function') return value.toString();
  return null;
};

const getRequestedMentionIds = (mentions = []) => {
  if (!Array.isArray(mentions)) return [];
  return mentions
    .map((mention) => normalizeId(mention?.user || mention?.userId || mention?._id || mention?.id || mention))
    .filter((id) => id && mongoose.Types.ObjectId.isValid(id));
};

const usernameMentionRegex = (username) => {
  const escaped = escapeRegExp(username);
  return new RegExp(`(^|\\s)@${escaped}(?=$|\\s|[.,!?;:)\\]])`, 'i');
};

const resolveMessageMentions = async ({
  conversation,
  senderId,
  content = '',
  mentions = []
}) => {
  if (!conversation?.participants?.length) {
    return { mentions: [], mentionedUserIds: [], mentionedUsers: [] };
  }

  const senderIdString = normalizeId(senderId);
  const participantIds = conversation.participants
    .map(normalizeId)
    .filter((id) => id && id !== senderIdString);

  if (!participantIds.length) {
    return { mentions: [], mentionedUserIds: [], mentionedUsers: [] };
  }

  const participants = await User.find({ _id: { $in: participantIds } })
    .select('username profilePicture')
    .lean();

  const validParticipantIds = new Set(participants.map((participant) => participant._id.toString()));
  const requestedIds = new Set(
    getRequestedMentionIds(mentions).filter((id) => validParticipantIds.has(id))
  );

  const text = typeof content === 'string' ? content : '';
  participants.forEach((participant) => {
    if (participant.username && usernameMentionRegex(participant.username).test(text)) {
      requestedIds.add(participant._id.toString());
    }
  });

  const mentionedUsers = participants.filter((participant) => requestedIds.has(participant._id.toString()));
  return {
    mentions: mentionedUsers.map((participant) => ({
      user: participant._id,
      username: participant.username,
      displayName: participant.username
    })),
    mentionedUserIds: mentionedUsers.map((participant) => participant._id.toString()),
    mentionedUsers
  };
};

module.exports = {
  resolveMessageMentions
};
