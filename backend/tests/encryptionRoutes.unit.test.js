// Verifies the legacy server-side encryption endpoints were fully removed.
// Those routes (POST /keys/generate, /encrypt, /decrypt, /encrypt/group) let
// the server generate and use users' private keys, which defeats end-to-end
// encryption. All crypto now happens client-side
// (frontend/src/services/encryptionService.js). With the paths no longer
// registered on the router, requests to them fall through to the app's 404
// handler instead of executing server-side crypto.
// The protect middleware pulls in config/secrets, which requires JWT_SECRET
// at load time — mock it so this pure route-table test needs no env vars.
jest.mock('../middleware/auth', () => ({
  protect: (req, res, next) => next()
}));

const router = require('../routes/encryptionRoutes');

const registeredPaths = router.stack
  .filter((layer) => layer.route)
  .map((layer) => layer.route.path);

describe('encryptionRoutes — legacy server-side encryption endpoints removed', () => {
  it('no longer registers POST /keys/generate', () => {
    expect(registeredPaths).not.toContain('/keys/generate');
  });

  it('no longer registers POST /encrypt', () => {
    expect(registeredPaths).not.toContain('/encrypt');
  });

  it('no longer registers POST /decrypt', () => {
    expect(registeredPaths).not.toContain('/decrypt');
  });

  it('no longer registers POST /encrypt/group', () => {
    expect(registeredPaths).not.toContain('/encrypt/group');
  });

  it('keeps the client-facing key-management routes', () => {
    expect(registeredPaths).toEqual(
      expect.arrayContaining([
        '/keys/public',
        '/keys/public/:userId',
        '/keys/rotate',
        '/keys',
        '/keys/status',
        '/keys/batch'
      ])
    );
  });
});
