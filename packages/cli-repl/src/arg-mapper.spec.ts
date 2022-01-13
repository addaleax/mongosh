import { CliOptions } from '@mongosh/service-provider-server';
import chai, { expect } from 'chai';
import path from 'path';
import sinonChai from 'sinon-chai';
import sinon from 'ts-sinon';
import mapCliToDriver, { getTlsCertificateSelector } from './arg-mapper';
chai.use(sinonChai);

const packageJSON = require('../package.json');

describe('arg-mapper.mapCliToDriver', () => {
  context('when cli args have authenticationDatabase', () => {
    const cliOptions: CliOptions = { authenticationDatabase: 'authDb' };

    it('maps to authSource', () => {
      expect(mapCliToDriver(cliOptions)).to.deep.equal({
        authSource: 'authDb',
        driverInfo: {
          name: 'mongosh',
          version: packageJSON.version
        }
      });
    });
  });

  context('when cli args have authenticationMechanism', () => {
    const cliOptions: CliOptions = { authenticationMechanism: 'SCRAM-SHA-1' };

    it('maps to authMechanism', () => {
      expect(mapCliToDriver(cliOptions)).to.deep.equal({
        authMechanism: 'SCRAM-SHA-1',
        driverInfo: {
          name: 'mongosh',
          version: packageJSON.version
        }
      });
    });
  });

  context('when cli args have quiet', () => {
    const cliOptions: CliOptions = { quiet: true };

    it('maps to loggerLevel', () => {
      expect(mapCliToDriver(cliOptions)).to.deep.equal({
        loggerLevel: 'error',
        driverInfo: {
          name: 'mongosh',
          version: packageJSON.version
        }
      });
    });
  });

  context('when cli args have verbose', () => {
    const cliOptions: CliOptions = { verbose: true };

    it('maps to loggerLevel', () => {
      expect(mapCliToDriver(cliOptions)).to.deep.equal({
        loggerLevel: 'debug',
        driverInfo: {
          name: 'mongosh',
          version: packageJSON.version
        }
      });
    });
  });

  context('when cli args have username', () => {
    const cliOptions: CliOptions = { username: 'richard' };

    it('maps to auth object', () => {
      expect(mapCliToDriver(cliOptions)).to.deep.equal({
        auth: {
          username: 'richard'
        },
        driverInfo: {
          name: 'mongosh',
          version: packageJSON.version
        }
      });
    });
  });

  context('when cli args have password', () => {
    const cliOptions: CliOptions = { password: 'aphextwin' };

    it('maps to auth object', () => {
      expect(mapCliToDriver(cliOptions)).to.deep.equal({
        auth: {
          password: 'aphextwin'
        },
        driverInfo: {
          name: 'mongosh',
          version: packageJSON.version
        }
      });
    });
  });

  context('when cli args have username and password', () => {
    const cliOptions: CliOptions = { username: 'richard', password: 'aphextwin' };

    it('maps to auth object', () => {
      expect(mapCliToDriver(cliOptions)).to.deep.equal({
        auth: {
          username: 'richard',
          password: 'aphextwin'
        },
        driverInfo: {
          name: 'mongosh',
          version: packageJSON.version
        }
      });
    });
  });

  context('when cli args have retryWrites', () => {
    const cliOptions: CliOptions = { retryWrites: true };

    it('maps the same argument', () => {
      expect(mapCliToDriver(cliOptions)).to.deep.equal({
        retryWrites: true,
        driverInfo: {
          name: 'mongosh',
          version: packageJSON.version
        }
      });
    });
  });

  context('when cli args have tls', () => {
    const cliOptions: CliOptions = { tls: true };

    it('maps the same argument', () => {
      expect(mapCliToDriver(cliOptions)).to.deep.equal({
        tls: true,
        driverInfo: {
          name: 'mongosh',
          version: packageJSON.version
        }
      });
    });
  });

  context('when cli args have tlsAllowInvalidCertificates', () => {
    const cliOptions: CliOptions = { tlsAllowInvalidCertificates: true };

    it('maps the same argument', () => {
      expect(mapCliToDriver(cliOptions)).to.deep.equal({
        tlsAllowInvalidCertificates: true,
        driverInfo: {
          name: 'mongosh',
          version: packageJSON.version
        }
      });
    });
  });

  context('when cli args have tlsAllowInvalidHostnames', () => {
    const cliOptions: CliOptions = { tlsAllowInvalidHostnames: true };

    it('maps the same argument', () => {
      expect(mapCliToDriver(cliOptions)).to.deep.equal({
        tlsAllowInvalidHostnames: true,
        driverInfo: {
          name: 'mongosh',
          version: packageJSON.version
        }
      });
    });
  });

  context('when cli args have tlsCAFile', () => {
    const cliOptions: CliOptions = { tlsCAFile: 'ca' };

    it('maps the same argument', () => {
      expect(mapCliToDriver(cliOptions)).to.deep.equal({
        tlsCAFile: 'ca',
        driverInfo: {
          name: 'mongosh',
          version: packageJSON.version
        }
      });
    });
  });

  context('when cli args have tlsCRLFile', () => {
    const cliOptions: CliOptions = { tlsCRLFile: 'key' };

    it('maps to sslCRL', () => {
      expect(mapCliToDriver(cliOptions)).to.deep.equal({
        sslCRL: 'key',
        driverInfo: {
          name: 'mongosh',
          version: packageJSON.version
        }
      });
    });
  });

  context('when cli args have tlsCertificateKeyFile', () => {
    const cliOptions: CliOptions = { tlsCertificateKeyFile: 'key' };

    it('maps the same argument', () => {
      expect(mapCliToDriver(cliOptions)).to.deep.equal({
        tlsCertificateKeyFile: 'key',
        driverInfo: {
          name: 'mongosh',
          version: packageJSON.version
        }
      });
    });
  });

  context('when cli args have tlsCertificateKeyFilePassword', () => {
    const cliOptions: CliOptions = { tlsCertificateKeyFilePassword: 'pw' };

    it('maps the same argument', () => {
      expect(mapCliToDriver(cliOptions)).to.deep.equal({
        tlsCertificateKeyFilePassword: 'pw',
        driverInfo: {
          name: 'mongosh',
          version: packageJSON.version
        }
      });
    });
  });

  context('when the cli args have awsAccessKeyId', () => {
    const cliOptions: CliOptions = { awsAccessKeyId: 'awskey' };

    it('maps to autoEncryption', () => {
      expect(mapCliToDriver(cliOptions)).to.deep.equal({
        autoEncryption: {
          kmsProviders: {
            aws: {
              accessKeyId: 'awskey'
            }
          }
        },
        driverInfo: {
          name: 'mongosh',
          version: packageJSON.version
        }
      });
    });
  });

  context('when the cli args have awsSecretAccessKey', () => {
    const cliOptions: CliOptions = { awsSecretAccessKey: 'secretkey' };

    it('maps to autoEncryption', () => {
      expect(mapCliToDriver(cliOptions)).to.deep.equal({
        autoEncryption: {
          kmsProviders: {
            aws: {
              secretAccessKey: 'secretkey'
            }
          }
        },
        driverInfo: {
          name: 'mongosh',
          version: packageJSON.version
        }
      });
    });
  });

  context('when the cli args have awsIamSessionToken', () => {
    const cliOptions: CliOptions = { awsIamSessionToken: 'token' };

    it('maps to authMechanismProperties.AWS_SESSION_TOKEN', () => {
      expect(mapCliToDriver(cliOptions)).to.deep.equal({
        authMechanismProperties: {
          AWS_SESSION_TOKEN: 'token'
        },
        driverInfo: {
          name: 'mongosh',
          version: packageJSON.version
        }
      });
    });
  });

  context('when the cli args have gssapiServiceName', () => {
    const cliOptions: CliOptions = { gssapiServiceName: 'alternate' };

    it('maps to authMechanismProperties.SERVICE_NAME', () => {
      expect(mapCliToDriver(cliOptions)).to.deep.equal({
        authMechanismProperties: {
          SERVICE_NAME: 'alternate'
        },
        driverInfo: {
          name: 'mongosh',
          version: packageJSON.version
        }
      });
    });
  });

  context('when the cli args have sspiRealmOverride', () => {
    const cliOptions: CliOptions = { sspiRealmOverride: 'REALM.COM' };

    it('maps to authMechanismProperties.SERVICE_REALM', () => {
      expect(mapCliToDriver(cliOptions)).to.deep.equal({
        authMechanismProperties: {
          SERVICE_REALM: 'REALM.COM'
        },
        driverInfo: {
          name: 'mongosh',
          version: packageJSON.version
        }
      });
    });
  });

  context('when the cli args have sspiHostnameCanonicalization', () => {
    context('with a value of none', () => {
      const cliOptions: CliOptions = { sspiHostnameCanonicalization: 'none' };

      it('is not mapped to authMechanismProperties', () => {
        expect(mapCliToDriver(cliOptions)).to.deep.equal({
          driverInfo: {
            name: 'mongosh',
            version: packageJSON.version
          }
        });
      });
    });

    context('with a value of forward', () => {
      const cliOptions: CliOptions = { sspiHostnameCanonicalization: 'forward' };

      it('is mapped to authMechanismProperties', () => {
        expect(mapCliToDriver(cliOptions)).to.deep.equal({
          authMechanismProperties: {
            gssapiCanonicalizeHostName: 'true'
          },
          driverInfo: {
            name: 'mongosh',
            version: packageJSON.version
          }
        });
      });
    });

    context('with a value of forwardAndReverse', () => {
      const cliOptions: CliOptions = { sspiHostnameCanonicalization: 'forwardAndReverse' };

      it('is mapped to authMechanismProperties', () => {
        try {
          mapCliToDriver(cliOptions);
        } catch (e) {
          expect(e.message).to.contain('forwardAndReverse is not supported');
          return;
        }
        expect.fail('expected error');
      });
    });
  });

  context('when the cli args have keyVaultNamespace', () => {
    const cliOptions: CliOptions = { keyVaultNamespace: 'db.datakeys' };

    it('maps to autoEncryption', () => {
      expect(mapCliToDriver(cliOptions)).to.deep.equal({
        autoEncryption: {
          keyVaultNamespace: 'db.datakeys'
        },
        driverInfo: {
          name: 'mongosh',
          version: packageJSON.version
        }
      });
    });
  });

  context('when the cli args have all FLE options', () => {
    const cliOptions: CliOptions = {
      keyVaultNamespace: 'db.datakeys',
      awsSecretAccessKey: 'secretkey',
      awsAccessKeyId: 'awskey'
    };

    it('maps to autoEncryption', () => {
      expect(mapCliToDriver(cliOptions)).to.deep.equal({
        autoEncryption: {
          keyVaultNamespace: 'db.datakeys',
          kmsProviders: {
            aws: {
              accessKeyId: 'awskey',
              secretAccessKey: 'secretkey'
            }
          }
        },
        driverInfo: {
          name: 'mongosh',
          version: packageJSON.version
        }
      });
    });
  });

  context('when the cli args have all server API options options', () => {
    const cliOptions: CliOptions = {
      apiStrict: true,
      apiDeprecationErrors: true,
      apiVersion: '1'
    };

    it('maps to serverApi', () => {
      expect(mapCliToDriver(cliOptions)).to.deep.equal({
        serverApi: {
          strict: true,
          deprecationErrors: true,
          version: '1'
        },
        driverInfo: {
          name: 'mongosh',
          version: packageJSON.version
        }
      });
    });
  });
});

describe('arg-mapper.applyTlsCertificateSelector', () => {
  context('with fake ca provider', () => {
    let exportCertificateAndPrivateKey: sinon.SinonStub;
    beforeEach(() => {
      process.env.TEST_OS_EXPORT_CERTIFICATE_AND_KEY_PATH =
        path.resolve(__dirname, '..', 'test', 'fixtures', 'fake-os-ca-provider.js');
      exportCertificateAndPrivateKey = sinon.stub();
      require(process.env.TEST_OS_EXPORT_CERTIFICATE_AND_KEY_PATH)
        .setFn((search) => exportCertificateAndPrivateKey(search));
    });
    afterEach(() => {
      delete process.env.TEST_OS_EXPORT_CERTIFICATE_AND_KEY_PATH;
    });

    it('leaves node options unchanged when no selector is given', () => {
      const applyTlsCertificateSelector = getTlsCertificateSelector(undefined);
      expect(applyTlsCertificateSelector).to.not.exist;
    });

    it('throws when the selector has an odd format', () => {
      expect(() => getTlsCertificateSelector('foo=bar'))
        .to.throw(/tlsCertificateSelector needs to include subject or thumbprint/);
    });

    it('returns passphrase and pfx as given by the (fake) OS', () => {
      const passphrase = 'abc';
      const pfx = Buffer.from('abcdef');
      exportCertificateAndPrivateKey.returns({
        passphrase, pfx
      });
      const applyTlsCertificateSelector = getTlsCertificateSelector('subject=Foo Bar');
      expect(applyTlsCertificateSelector).to.deep.equal({
        passphrase, pfx
      });
    });
  });

  context('with what the OS gives us', () => {
    it('throws an error on non-win32 and non-darwin', function() {
      if (process.platform === 'win32' || process.platform === 'darwin') {
        return this.skip();
      }
      expect(() => getTlsCertificateSelector('subject=Foo Bar'))
        .to.throw(/tlsCertificateSelector is not supported on this platform/);
    });

    it('tries to search the OS CA store on win32', function() {
      if (process.platform !== 'win32') {
        return this.skip();
      }
      expect(() => getTlsCertificateSelector('subject=Foo Bar'))
        .to.throw(/Could not resolve certificate specification/);
    });

    it('tries to search the OS keychain on darwin', function() {
      if (process.platform !== 'darwin') {
        return this.skip();
      }
      expect(() => getTlsCertificateSelector('subject=Foo Bar'))
        .to.throw(/Could not find a matching certificate/);
    });
  });
});
