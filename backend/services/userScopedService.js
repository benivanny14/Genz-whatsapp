/**
 * userScopedService.js
 * --------------------
 * Shared helpers extracted from ~33 controllers that each duplicated the
 * same user-scoped scaffolding (REFACTOR_PLAN.md step 5):
 *
 *   getUser(req, res)            — load the authenticated user, 401 if missing
 *   mergeSettings(defaults, s)   — shallow-merge a user settings object over defaults
 *   createSettingsMerger(d)      — closure: (settings) => mergeSettings(d, settings)
 *   createSettingsHandlers(cfg)  — the standard get/update/reset settings trio
 *
 * `createSettingsMerger` lets existing controllers keep their
 * `mergeSettings(user.xxxSettings)` call sites untouched (they just swap
 * the local definition for `createSettingsMerger(defaultSettings)`).
 */

const User = require('../models/User');

/**
 * Load the current user from the DB.
 * Answers 401 (and returns null) when no user is authenticated or found.
 */
const getUser = async (req, res) => {
  const user = await User.findById(req.user?._id);
  if (!user) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return null;
  }
  return user;
};

/**
 * Shallow-merge settings over a defaults object (unknown keys are dropped
 * because they are not part of defaults).
 */
const mergeSettings = (defaults, settings = {}) => ({
  ...defaults,
  ...settings
});

/**
 * Return a settings-merge function bound to a fixed defaults object —
 * drop-in replacement for the old `const mergeSettings = (settings = {}) =>
 * ({ ...defaultSettings, ...settings })` pattern.
 */
const createSettingsMerger = (defaults) => (settings = {}) => mergeSettings(defaults, settings);

/**
 * Build the standard settings handler trio (get / update / reset) that was
 * duplicated across ~25 controllers (REFACTOR_PLAN.md step 11). Each trio
 * only differs by:
 *
 *   field          — the User property holding the settings (e.g. 'antiBanSettings')
 *   label          — human-readable feature name used in error logs (e.g. 'anti-ban')
 *   mergeSettings  — a one-arg merge closure (e.g. createSettingsMerger(defaults)),
 *                    or the raw two-arg mergeSettings when `defaults` is provided
 *   defaults       — optional defaults object; when given, mergeSettings is
 *                    called as mergeSettings(defaults, settings)
 *
 * Handlers keep the exact behavior the controllers had: getUser + 401,
 * markModified + save, and the standard `{ success: true, settings }` shape.
 */
const createSettingsHandlers = ({ field, label, mergeSettings, defaults }) => {
  const apply = (settings) => (defaults ? mergeSettings(defaults, settings) : mergeSettings(settings));

  const getSettings = async (req, res) => {
    try {
      const user = await getUser(req, res);
      if (!user) return;

      const settings = apply(user[field]?.toObject?.() || user[field]);
      res.status(200).json({ success: true, settings });
    } catch (error) {
      console.error(`Get ${label} settings error:`, error);
      res.status(500).json({ success: false, message: error.message });
    }
  };

  const updateSettings = async (req, res) => {
    try {
      const user = await getUser(req, res);
      if (!user) return;

      const incoming = req.body.settings || req.body;
      const existing = user[field]?.toObject?.() || user[field] || {};

      user[field] = apply({ ...existing, ...incoming });
      user.markModified(field);
      await user.save();

      res.status(200).json({ success: true, settings: user[field] });
    } catch (error) {
      console.error(`Update ${label} settings error:`, error);
      res.status(500).json({ success: false, message: error.message });
    }
  };

  const resetSettings = async (req, res) => {
    try {
      const user = await getUser(req, res);
      if (!user) return;

      user[field] = apply({});
      user.markModified(field);
      await user.save();

      res.status(200).json({ success: true, settings: user[field] });
    } catch (error) {
      console.error(`Reset ${label} settings error:`, error);
      res.status(500).json({ success: false, message: error.message });
    }
  };

  return { getSettings, updateSettings, resetSettings };
};

/**
 * Build a single-field settings toggle handler (the toggle* handler that was
 * duplicated ~55 times across 6 controllers, REFACTOR_PLAN.md step 12). The
 * handlers differ only by:
 *
 *   settingsField  — the User property holding the settings (e.g. 'mediaModsSettings')
 *   merge          — one-arg merge closure (createSettingsMerger(defaults)), or a
 *                    wrapper around the two-arg mergeSettings(defaults, s)
 *   loadUser       — user loader, defaults to getUser (securityController uses requireUser)
 *   transform      — optional pre-save transform of the merged object (e.g. compactSettings)
 *   acceptEnabled  — when true, reads optional req.body.enabled (group-features style)
 *                    and responds with the full settings object instead of { [field]: value }
 */
const createToggleHandler = ({
  settingsField,
  merge,
  loadUser = getUser,
  transform,
  acceptEnabled = false
}) =>
  async (req, res, field, logLabel) => {
    try {
      const user = await loadUser(req, res);
      if (!user) return;

      const existing = user[settingsField]?.toObject?.() || user[settingsField] || {};
      const newValue = acceptEnabled
        ? (req.body.enabled !== undefined ? req.body.enabled : !existing[field])
        : !existing[field];
      const merged = transform
        ? transform({ ...existing, [field]: newValue })
        : { ...existing, [field]: newValue };

      user[settingsField] = merge(merged);
      user.markModified(settingsField);
      await user.save();

      if (acceptEnabled) {
        res.status(200).json({ success: true, settings: user[settingsField] });
      } else {
        res.json({ success: true, [field]: newValue });
      }
    } catch (error) {
      console.error(`${logLabel} error:`, error);
      res.status(500).json({ success: false, message: error.message });
    }
  };

module.exports = {
  getUser,
  mergeSettings,
  createSettingsMerger,
  createSettingsHandlers,
  createToggleHandler
};
