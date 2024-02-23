import { ClearClipboardDelaySetting } from "../../../../../apps/browser/src/autofill/constants";
import { StateDefinitionLike, MigrationHelper } from "../migration-helper";
import { Migrator } from "../migrator";

type ExpectedAccountState = {
  settings?: {
    clearClipboard?: ClearClipboardDelaySetting;
  };
};

const autofillSettingsLocalStateDefinition: {
  stateDefinition: StateDefinitionLike;
} = {
  stateDefinition: {
    name: "autofillSettingsLocal",
  },
};

export class ClearClipboardDelayMigrator extends Migrator<24, 25> {
  async migrate(helper: MigrationHelper): Promise<void> {
    // account state (e.g. account settings -> state provider framework keys)
    const accounts = await helper.getAccounts<ExpectedAccountState>();

    await Promise.all([...accounts.map(({ userId, account }) => migrateAccount(userId, account))]);

    // migrate account state
    async function migrateAccount(userId: string, account: ExpectedAccountState): Promise<void> {
      const accountSettings = account?.settings;

      if (accountSettings?.clearClipboard !== undefined) {
        await helper.setToUser(
          userId,
          { ...autofillSettingsLocalStateDefinition, key: "clearClipboardDelay" },
          accountSettings.clearClipboard,
        );
        delete account.settings.clearClipboard;

        // update the state account settings with the migrated values deleted
        await helper.set(userId, account);
      }
    }
  }

  async rollback(helper: MigrationHelper): Promise<void> {
    // account state (e.g. state provider framework keys -> account settings)
    const accounts = await helper.getAccounts<ExpectedAccountState>();

    await Promise.all([...accounts.map(({ userId, account }) => rollbackAccount(userId, account))]);

    // rollback account state
    async function rollbackAccount(userId: string, account: ExpectedAccountState): Promise<void> {
      let settings = account?.settings || {};

      const clearClipboardDelay: ClearClipboardDelaySetting = await helper.getFromUser(userId, {
        ...autofillSettingsLocalStateDefinition,
        key: "clearClipboardDelay",
      });

      // update new settings and remove the account state provider framework keys for the rolled back values
      if (clearClipboardDelay !== undefined) {
        settings = { ...settings, clearClipboard: clearClipboardDelay };

        await helper.setToUser(
          userId,
          { ...autofillSettingsLocalStateDefinition, key: "clearClipboardDelay" },
          null,
        );

        // commit updated settings to state
        await helper.set(userId, {
          ...account,
          settings,
        });
      }
    }
  }
}
