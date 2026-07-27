const User = require('../models/User');
const Conversation = require('../models/Conversation');

const defaultSettings = {
  chatFoldersEnabled: true,
  maxFolders: 20,
  maxChatsPerFolder: 50,
  autoOrganize: false,
  showFolderBadges: true,
  folderColors: ['#00a884', '#34b7f1', '#a855f7', '#f59e0b', '#ef4444', '#10b981']
};

const getUser = async (req, res) => {
  const user = await User.findById(req.user?._id);
  if (!user) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return null;
  }
  return user;
};

const mergeSettings = (settings = {}) => ({
  ...defaultSettings,
  ...settings
});

// @desc    Get chat folders settings
// @route   GET /api/chat-folders/settings
// @access  Private
exports.getChatFoldersSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeSettings(user.chatFoldersSettings?.toObject?.() || user.chatFoldersSettings);
    res.status(200).json({ success: true, settings });
  } catch (error) {
    console.error('Get chat folders settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update chat folders settings
// @route   POST /api/chat-folders/settings
// @access  Private
exports.updateChatFoldersSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const incoming = req.body.settings || req.body;
    const existing = user.chatFoldersSettings?.toObject?.() || user.chatFoldersSettings || {};
    
    user.chatFoldersSettings = mergeSettings({ ...existing, ...incoming });
    user.markModified('chatFoldersSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.chatFoldersSettings });
  } catch (error) {
    console.error('Update chat folders settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create chat folder
// @route   POST /api/chat-folders/create
// @access  Private
exports.createChatFolder = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { name, color, icon } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Folder name is required' });
    }

    const settings = mergeSettings(user.chatFoldersSettings?.toObject?.() || user.chatFoldersSettings);
    
    if (!settings.chatFoldersEnabled) {
      return res.status(403).json({ success: false, message: 'Chat folders are disabled' });
    }

    if (!user.chatFolders) user.chatFolders = [];
    
    if (user.chatFolders.length >= settings.maxFolders) {
      return res.status(400).json({ 
        success: false, 
        message: `Maximum ${settings.maxFolders} folders allowed` 
      });
    }

    const folder = {
      _id: new (require('mongoose').Types.ObjectId)(),
      name,
      color: color || settings.folderColors[user.chatFolders.length % settings.folderColors.length],
      icon: icon || 'folder',
      chatIds: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    user.chatFolders.push(folder);
    await user.save();

    res.status(200).json({ success: true, folder });
  } catch (error) {
    console.error('Create chat folder error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all chat folders
// @route   GET /api/chat-folders
// @access  Private
exports.getChatFolders = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const folders = user.chatFolders || [];
    
    // Get conversation details for each folder
    const foldersWithChats = await Promise.all(
      folders.map(async (folder) => {
        const conversations = await Conversation.find({
          _id: { $in: folder.chatIds },
          participants: user._id
        }).populate('participants', 'username profilePicture');
        
        return {
          ...folder.toObject(),
          conversations,
          chatCount: conversations.length
        };
      })
    );

    res.status(200).json({ success: true, folders: foldersWithChats });
  } catch (error) {
    console.error('Get chat folders error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single chat folder
// @route   GET /api/chat-folders/:id
// @access  Private
exports.getChatFolder = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { id } = req.params;

    const folder = (user.chatFolders || []).find(f => f._id.toString() === id);
    if (!folder) {
      return res.status(404).json({ success: false, message: 'Folder not found' });
    }

    const conversations = await Conversation.find({
      _id: { $in: folder.chatIds },
      participants: user._id
    }).populate('participants', 'username profilePicture');

    res.status(200).json({ 
      success: true, 
      folder: {
        ...folder.toObject(),
        conversations,
        chatCount: conversations.length
      }
    });
  } catch (error) {
    console.error('Get chat folder error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update chat folder
// @route   POST /api/chat-folders/:id
// @access  Private
exports.updateChatFolder = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { id } = req.params;
    const { name, color, icon } = req.body;

    const folders = user.chatFolders || [];
    const index = folders.findIndex(f => f._id.toString() === id);
    
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Folder not found' });
    }

    folders[index].name = name || folders[index].name;
    folders[index].color = color !== undefined ? color : folders[index].color;
    folders[index].icon = icon !== undefined ? icon : folders[index].icon;
    folders[index].updatedAt = new Date();

    user.chatFolders = folders;
    await user.save();

    res.status(200).json({ success: true, folder: folders[index] });
  } catch (error) {
    console.error('Update chat folder error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete chat folder
// @route   DELETE /api/chat-folders/:id
// @access  Private
exports.deleteChatFolder = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { id } = req.params;

    const folders = user.chatFolders || [];
    const index = folders.findIndex(f => f._id.toString() === id);
    
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Folder not found' });
    }

    folders.splice(index, 1);
    user.chatFolders = folders;
    await user.save();

    res.status(200).json({ success: true, message: 'Folder deleted' });
  } catch (error) {
    console.error('Delete chat folder error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add chat to folder
// @route   POST /api/chat-folders/:folderId/chat
// @access  Private
exports.addChatToFolder = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { folderId } = req.params;
    const { chatId } = req.body;

    if (!chatId) {
      return res.status(400).json({ success: false, message: 'Chat ID is required' });
    }

    const settings = mergeSettings(user.chatFoldersSettings?.toObject?.() || user.chatFoldersSettings);
    
    const folders = user.chatFolders || [];
    const index = folders.findIndex(f => f._id.toString() === folderId);
    
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Folder not found' });
    }

    // Check max chats per folder
    if (folders[index].chatIds.length >= settings.maxChatsPerFolder) {
      return res.status(400).json({ 
        success: false, 
        message: `Maximum ${settings.maxChatsPerFolder} chats per folder` 
      });
    }

    // Verify conversation exists and belongs to user
    const conversation = await Conversation.findOne({
      _id: chatId,
      participants: user._id
    });

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found or not accessible' });
    }

    if (!folders[index].chatIds.includes(chatId)) {
      folders[index].chatIds.push(chatId);
      folders[index].updatedAt = new Date();
    }

    user.chatFolders = folders;
    await user.save();

    res.status(200).json({ success: true, folder: folders[index] });
  } catch (error) {
    console.error('Add chat to folder error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Remove chat from folder
// @route   DELETE /api/chat-folders/:folderId/chat/:chatId
// @access  Private
exports.removeChatFromFolder = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { folderId, chatId } = req.params;

    const folders = user.chatFolders || [];
    const index = folders.findIndex(f => f._id.toString() === folderId);
    
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Folder not found' });
    }

    folders[index].chatIds = folders[index].chatIds.filter(id => id !== chatId);
    folders[index].updatedAt = new Date();

    user.chatFolders = folders;
    await user.save();

    res.status(200).json({ success: true, folder: folders[index] });
  } catch (error) {
    console.error('Remove chat from folder error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Auto organize chats into folders
// @route   POST /api/chat-folders/auto-organize
// @access  Private
exports.autoOrganizeChats = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeSettings(user.chatFoldersSettings?.toObject?.() || user.chatFoldersSettings);
    
    if (!settings.autoOrganize) {
      return res.status(403).json({ success: false, message: 'Auto organize is disabled' });
    }

    // Get all conversations
    const conversations = await Conversation.find({
      participants: user._id
    });

    // Create default folders if they don't exist
    const defaultFolders = [
      { name: 'Work', icon: 'briefcase' },
      { name: 'Family', icon: 'users' },
      { name: 'Friends', icon: 'heart' },
      { name: 'Groups', icon: 'users' }
    ];

    for (const defaultFolder of defaultFolders) {
      const existingFolder = (user.chatFolders || []).find(f => f.name === defaultFolder.name);
      
      if (!existingFolder) {
        const folder = {
          _id: new (require('mongoose').Types.ObjectId)(),
          name: defaultFolder.name,
          icon: defaultFolder.icon,
          color: settings.folderColors[(user.chatFolders?.length || 0) % settings.folderColors.length],
          chatIds: [],
          createdAt: new Date(),
          updatedAt: new Date()
        };

        if (!user.chatFolders) user.chatFolders = [];
        user.chatFolders.push(folder);
      }
    }

    // Organize conversations into folders (mock logic)
    const folders = user.chatFolders || [];
    
    conversations.forEach(conv => {
      if (conv.isGroup) {
        const groupsFolder = folders.find(f => f.name === 'Groups');
        if (groupsFolder && !groupsFolder.chatIds.includes(conv._id.toString())) {
          groupsFolder.chatIds.push(conv._id.toString());
        }
      }
    });

    user.chatFolders = folders;
    await user.save();

    res.status(200).json({ success: true, folders: user.chatFolders });
  } catch (error) {
    console.error('Auto organize chats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle chat folders
// @route   POST /api/chat-folders/toggle
// @access  Private
exports.toggleChatFolders = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { enabled } = req.body;
    const existing = user.chatFoldersSettings?.toObject?.() || user.chatFoldersSettings || {};
    
    user.chatFoldersSettings = mergeSettings({
      ...existing,
      chatFoldersEnabled: enabled !== undefined ? enabled : !existing.chatFoldersEnabled
    });
    user.markModified('chatFoldersSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.chatFoldersSettings });
  } catch (error) {
    console.error('Toggle chat folders error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset chat folders settings to default
// @route   POST /api/chat-folders/reset
// @access  Private
exports.resetChatFoldersSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    user.chatFoldersSettings = mergeSettings({});
    user.markModified('chatFoldersSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.chatFoldersSettings });
  } catch (error) {
    console.error('Reset chat folders settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
