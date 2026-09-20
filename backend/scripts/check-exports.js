const path = require('path');
const assert = require('assert');

const required = [
  ['../controllers/downloadController.js', ['serveDownloadPage', 'serveVersionJson', 'serveApk']],
  ['../utils/conversationPush.js', ['notifyConversationMessage', 'buildPreview']],
  ['../config/firebase.js', ['sendNotification', 'sendMulticastNotification', 'isConfigured']],
  ['../services/notificationService.js', ['sendNewMessageNotification', 'sendGroupNotification', 'sendNewStatusNotification', 'sendIncomingCallNotification']],
  ['../controllers/statusController.js', ['createStatus', 'getStatuses', 'viewStatus', 'reactToStatus', 'replyToStatus', 'deleteStatus']],
  ['../controllers/fcmController.js', ['registerToken', 'unregisterToken']]
];

for (const [rel, names] of required) {
  const mod = require(path.join(__dirname, rel));
  for (const name of names) {
    assert.equal(typeof mod[name], 'function', `${rel} missing export ${name}`);
  }
}

console.log(`check:exports passed for ${required.length} modules`);
