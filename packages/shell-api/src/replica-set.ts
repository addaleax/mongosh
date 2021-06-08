import { CommonErrors, MongoshDeprecatedError, MongoshInvalidInputError, MongoshRuntimeError } from '@mongosh/errors';
import { redactCredentials } from '@mongosh/history';
import { Document } from '@mongosh/service-provider-core';
import Mongo from './mongo';
import Database from './database';
import {
  deprecated,
  returnsPromise,
  shellApiClassDefault,
  ShellApiWithMongoClass
} from './decorators';
import { asPrintable } from './enums';
import { assertArgsDefinedType } from './helpers';
import { CommandResult } from './result';

export type ReplSetMemberConfig = {
  _id: number;
  host: string;
  priority?: number;
  votes?: number;
  arbiterOnly?: boolean;
};

export type ReplSetConfig = {
  version: number;
  _id: string;
  members: ReplSetMemberConfig[];
  protocolVersion: number;
};

@shellApiClassDefault
export default class ReplicaSet extends ShellApiWithMongoClass {
  _database: Database;

  constructor(database: Database) {
    super();
    this._database = database;
  }

  get _mongo(): Mongo {
    return this._database._mongo;
  }

  /**
   *  rs.initiate calls replSetInitiate admin command.
   *
   * @param config
   */
  @returnsPromise
  async initiate(config: Partial<ReplSetConfig> = {}): Promise<Document> {
    this._emitReplicaSetApiCall('initiate', { config });
    return this._database._runAdminCommand({ replSetInitiate: config });
  }

  async _getConfig(): Promise<ReplSetConfig> {
    try {
      const result = await this._database._runAdminCommand(
        { replSetGetConfig: 1 }
      );
      if (result.config === undefined) {
        throw new MongoshRuntimeError('Documented returned from command replSetGetConfig does not contain \'config\'', CommonErrors.CommandFailed);
      }
      return result.config;
    } catch (error) {
      if (error.codeName === 'CommandNotFound' || error.codeName === 'APIStrictError') {
        const doc = await this._database.getSiblingDB('local').getCollection('system.replset').findOne() as ReplSetConfig | null;
        if (doc === null) {
          throw new MongoshRuntimeError('No documents in local.system.replset', CommonErrors.CommandFailed);
        }
        return doc;
      }
      throw error;
    }
  }

  /**
   *  rs.config calls replSetGetConfig admin command.
   *
   *  Returns a document that contains the current replica set configuration.
   */
  @returnsPromise
  async config(): Promise<ReplSetConfig> {
    this._emitReplicaSetApiCall('config', {});
    return this._getConfig();
  }

  /**
   * Alias, conf is documented but config is not
   */
  @returnsPromise
  async conf(): Promise<ReplSetConfig> {
    this._emitReplicaSetApiCall('conf', {});
    return this._getConfig();
  }

  /**
   *  rs.reconfig calls replSetReconfig admin command.
   *
   *  @param config
   *  @param options
   */
  @returnsPromise
  async reconfig(config: Partial<ReplSetConfig>, options = {}): Promise<Document> {
    assertArgsDefinedType([ config, options ], ['object', [undefined, 'object']], 'ReplicaSet.reconfig');
    this._emitReplicaSetApiCall('reconfig', { config, options });

    const runReconfig = async(): Promise<Document> => {
      const conf = await this._getConfig();
      config.version = conf.version ? conf.version + 1 : 1;
      config.protocolVersion ??= conf.protocolVersion; // Needed on mongod 4.0.x
      const cmd = { replSetReconfig: config, ...options };
      return await this._database._runAdminCommand(cmd);
    };

    let result: [ 'error', Error ] | [ 'success', Document ] = [ 'success', {} ];
    let sleepInterval = 1000;
    for (let i = 0; i < 12; i++) {
      try {
        if (result[0] === 'error') {
          // Do a mild exponential backoff. If it's been a while since the last
          // update, also tell the user that we're actually still working on
          // the reconfig.
          await this._internalState.shellApi.sleep(sleepInterval);
          sleepInterval *= 1.3;
          if (sleepInterval > 2500) {
            await this._internalState.shellApi.print('Reconfig did not succeed yet, starting new attempt...');
          }
        }
        result = [ 'success', await runReconfig() ];
        break;
      } catch (err) {
        result = [ 'error', err ];
      }
    }

    if (result[0] === 'error') {
      throw result[1];
    }
    return result[1];
  }

  /**
   * A more involved version specifically for transitioning from a Primary-Arbiter
   * to a Primary-Secondary-Arbiter set (PA to PSA for short).
   */
  @returnsPromise
  async reconfigForPSASet(newMemberIndex: number, config: Partial<ReplSetConfig>, options = {}): Promise<Document> {
    assertArgsDefinedType(
      [ newMemberIndex, config, options ],
      [ 'number', 'object', [undefined, 'object'] ],
      'ReplicaSet.reconfigForPSASet');
    this._emitReplicaSetApiCall('reconfigForPSASet', { newMemberIndex, config, options });
    const print = (msg: string) => this._internalState.shellApi.print(msg);

    // First, perform some validation on the combination of newMemberIndex + config.
    const newMemberConfig = config.members?.[newMemberIndex];
    if (!newMemberConfig) {
      throw new MongoshInvalidInputError(
        `Node at index ${newMemberIndex} does not exist in the new config`,
        CommonErrors.InvalidArgument
      );
    }
    if (newMemberConfig.votes !== 1) {
      throw new MongoshInvalidInputError(
        `Node at index ${newMemberIndex} must have { votes: 1 } in the new config (actual: { votes: ${newMemberConfig.votes} })`,
        CommonErrors.InvalidArgument
      );
    }

    const oldConfig = await this._getConfig();

    // Use _id to compare nodes across configs.
    const oldMemberConfig = oldConfig.members.find(member => member._id === newMemberConfig._id);

    // If the node doesn't exist in the old config, we are adding it as a new node. Skip validating
    // the node in the old config.
    if (!oldMemberConfig) {
      if (oldConfig.members.find(member => member.host === newMemberConfig.host)) {
        await print(
          `Warning: Node at index ${newMemberIndex} has { host: "${newMemberConfig.host}" }, ` +
          'which is also present in the old config, but with a different _id field.');
      }
    } else if (oldMemberConfig.votes) {
      throw new MongoshInvalidInputError(
        `Node at index ${newMemberIndex} must have { votes: 0 } in the old config (actual: { votes: ${oldMemberConfig.votes} })`,
        CommonErrors.InvalidArgument
      );
    }

    // The new config is valid, so start the first reconfig.
    const newMemberPriority = newMemberConfig.priority;
    await print(`Running first reconfig to give member at index ${newMemberIndex} { votes: 1, priority: 0 }`);
    newMemberConfig.votes = 1;
    newMemberConfig.priority = 0;
    const firstResult = await this.reconfig(config, options);

    if (newMemberPriority === 0) {
      await print('No second reconfig necessary because .priority = 0');
      return firstResult;
    }

    await print(`Running second reconfig to give member at index ${newMemberIndex} { priority: ${newMemberPriority} }`);
    newMemberConfig.priority = newMemberPriority;

    try {
      return await this.reconfig(config, options);
    } catch (e) {
      // If this did not work out, print the attempted command to give the user
      // a chance to complete the second reconfig manually.
      await print('Second reconfig did not succeed, giving up');
      await print(`Attempted command: rs.reconfig(${JSON.stringify(config, null, '  ')}, ${JSON.stringify(options)})`);
      throw e;
    }
  }

  @returnsPromise
  async status(): Promise<Document> {
    this._emitReplicaSetApiCall('status', {});
    return this._database._runAdminCommand(
      {
        replSetGetStatus: 1,
      }
    );
  }

  @returnsPromise
  async isMaster(): Promise<Document> {
    this._emitReplicaSetApiCall('isMaster', {});
    return this._database.getSiblingDB('admin').isMaster();
  }

  @returnsPromise
  async hello(): Promise<Document> {
    this._emitReplicaSetApiCall('hello', {});
    return this._database.getSiblingDB('admin').hello();
  }

  @returnsPromise
  async printSecondaryReplicationInfo(): Promise<CommandResult> {
    this._emitReplicaSetApiCall('printSecondaryReplicationInfo', {});
    return this._database.printSecondaryReplicationInfo();
  }

  @deprecated
  @returnsPromise
  async printSlaveReplicationInfo(): Promise<CommandResult> {
    throw new MongoshDeprecatedError('printSlaveReplicationInfo has been deprecated. Use printSecondaryReplicationInfo instead');
  }

  @returnsPromise
  async printReplicationInfo(): Promise<CommandResult> {
    this._emitReplicaSetApiCall('printReplicationInfo', {});
    return this._database.printReplicationInfo();
  }

  @returnsPromise
  async add(hostport: string | Partial<ReplSetMemberConfig>, arb?: boolean): Promise<Document> {
    assertArgsDefinedType([hostport, arb], [['string', 'object'], [undefined, 'boolean']], 'ReplicaSet.add');
    this._emitReplicaSetApiCall('add', { hostport, arb });

    const configDoc = await this._getConfig();

    configDoc.version++;

    const max = Math.max(...configDoc.members.map(m => m._id));
    let cfg: Partial<ReplSetMemberConfig>;
    if (typeof hostport === 'string') {
      cfg = { _id: max + 1, host: hostport };
      if (arb) {
        cfg.arbiterOnly = true;
      }
    } else if (arb === true) {
      throw new MongoshInvalidInputError(
        `Expected first parameter to be a host-and-port string of arbiter, but got ${JSON.stringify(hostport)}`,
        CommonErrors.InvalidArgument
      );
    } else {
      cfg = hostport;
      if (cfg._id === null || cfg._id === undefined) {
        cfg._id = max + 1;
      }
    }

    configDoc.members.push(cfg as ReplSetMemberConfig);
    return this._database._runAdminCommand(
      {
        replSetReconfig: configDoc,
      }
    );
  }

  @returnsPromise
  async addArb(hostname: string): Promise<Document> {
    this._emitReplicaSetApiCall('addArb', { hostname });
    return this.add(hostname, true);
  }

  @returnsPromise
  async remove(hostname: string): Promise<Document> {
    assertArgsDefinedType([hostname], ['string'], 'ReplicaSet.remove');
    this._emitReplicaSetApiCall('remove', { hostname });
    const configDoc = await this._getConfig();
    configDoc.version++;

    for (let i = 0; i < configDoc.members.length; i++) {
      if (configDoc.members[i].host === hostname) {
        configDoc.members.splice(i, 1);
        return this._database._runAdminCommand(
          {
            replSetReconfig: configDoc,
          }
        );
      }
    }
    throw new MongoshInvalidInputError(
      `Couldn't find ${hostname} in ${JSON.stringify(configDoc.members)}. Is ${hostname} a member of this replset?`,
      CommonErrors.InvalidArgument
    );
  }

  @returnsPromise
  async freeze(secs: number): Promise<Document> {
    assertArgsDefinedType([secs], ['number'], 'ReplicaSet.freeze');
    this._emitReplicaSetApiCall('freeze', { secs });
    return this._database._runAdminCommand(
      {
        replSetFreeze: secs,
      }
    );
  }

  @returnsPromise
  async stepDown(stepdownSecs?: number, catchUpSecs?: number): Promise<Document> {
    assertArgsDefinedType([stepdownSecs, catchUpSecs], [[undefined, 'number'], [undefined, 'number']], 'ReplicaSet.stepDown');
    this._emitReplicaSetApiCall('stepDown', { stepdownSecs, catchUpSecs });
    const cmd: Document = {
      replSetStepDown: stepdownSecs === undefined ? 60 : stepdownSecs,
    };
    if (catchUpSecs !== undefined) {
      cmd.secondaryCatchUpPeriodSecs = catchUpSecs;
    }
    return this._database._runAdminCommand(
      cmd
    );
  }

  @returnsPromise
  async syncFrom(host: string): Promise<Document> {
    assertArgsDefinedType([host], ['string'], 'ReplicaSet.syncFrom');
    this._emitReplicaSetApiCall('syncFrom', { host });
    return this._database._runAdminCommand(
      {
        replSetSyncFrom: host,
      }
    );
  }

  /**
   * Internal method to determine what is printed for this class.
   */
  [asPrintable](): string {
    return `ReplicaSet class connected to ${redactCredentials(this._database._mongo._uri)} via db ${this._database._name}`;
  }

  /**
   * Internal helper for emitting ReplicaSet API call events.
   *
   * @param methodName
   * @param methodArguments
   * @private
   */
  private _emitReplicaSetApiCall(methodName: string, methodArguments: Document = {}): void {
    this._database._mongo._internalState.emitApiCall({
      method: methodName,
      class: 'ReplicaSet',
      arguments: methodArguments
    });
  }
}
