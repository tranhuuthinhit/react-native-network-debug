import { LIB_VERSION } from '../constant';
import createHar from '../utils/createHar';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pkg = require('../../package.json');

describe('LIB_VERSION', () => {
  it('matches the version in package.json', () => {
    // The HAR `creator.version` is a hardcoded constant because there is
    // no way to read package.json at runtime without bundling the whole
    // manifest. This test is what stops the two drifting apart on a
    // release, which is easy to forget.
    expect(LIB_VERSION).toBe(pkg.version);
  });

  it('is stamped into HAR exports', async () => {
    const har = await createHar([]);
    expect(har.log.creator).toEqual({
      name: 'react-native-network-debug',
      version: pkg.version,
    });
  });
});
