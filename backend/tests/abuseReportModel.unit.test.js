/**
 * Model-level tests for AbuseReport.
 *
 * Guards the CSAM escalation path (B.2): the category enum MUST accept
 * 'csam'/'child_abuse' (it previously rejected them, so every CSAM report
 * failed with a validation error and was silently lost), and the schema must
 * allow priority 'urgent'.
 */
const mongoose = require('mongoose');

describe('AbuseReport model (CSAM escalation, B.2)', () => {
  it('accepts csam / child_abuse categories', async () => {
    const AbuseReport = require('../models/AbuseReport');
    for (const category of ['csam', 'child_abuse']) {
      const report = new AbuseReport({
        reporterId: new mongoose.Types.ObjectId(),
        reportedUserId: new mongoose.Types.ObjectId(),
        category,
        description: 'test child-safety report',
        priority: 'urgent',
        contentType: 'message'
      });
      const err = report.validateSync();
      expect(err).toBeUndefined();
    }
  });

  it('accepts priority urgent and defaults to medium', async () => {
    const AbuseReport = require('../models/AbuseReport');
    const urgent = new AbuseReport({
      reporterId: new mongoose.Types.ObjectId(),
      reportedUserId: new mongoose.Types.ObjectId(),
      category: 'csam',
      description: 'x',
      priority: 'urgent'
    });
    expect(urgent.priority).toBe('urgent');

    const normal = new AbuseReport({
      reporterId: new mongoose.Types.ObjectId(),
      reportedUserId: new mongoose.Types.ObjectId(),
      category: 'spam',
      description: 'x'
    });
    expect(normal.priority).toBe('medium');
  });

  it('rejects unknown categories', async () => {
    const AbuseReport = require('../models/AbuseReport');
    const bad = new AbuseReport({
      reporterId: new mongoose.Types.ObjectId(),
      reportedUserId: new mongoose.Types.ObjectId(),
      category: 'bogus',
      description: 'x'
    });
    const err = bad.validateSync();
    expect(err).toBeTruthy();
    expect(String(err.errors.category.message)).toMatch(/enum/i);
  });
});
