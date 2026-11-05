/* exported imapSync */
const { getFolder } = ChromeUtils.importESModule("resource:///modules/ExtensionAccounts.sys.mjs");

// Selecting a folder in the UI runs updateFolderWithListener (server headers -> local DB);
// the WebExtension API has no equivalent, so messages.list() reads 0 for a never-opened IMAP folder.
var imapSync = class extends ExtensionCommon.ExtensionAPI {
  getAPI() {
    return {
      imapSync: {
        /** @returns {Promise<void>} */
        syncFolder(folderId) {
          const { folder } = getFolder(folderId);
          if (!(folder instanceof Ci.nsIMsgImapMailFolder)) return Promise.resolve(); // local folders are always current
          /** @type {Promise<void>} */
          const syncPromise = new Promise((resolve) =>
            folder.updateFolderWithListener(null, { OnStartRunningUrl() {}, OnStopRunningUrl: () => resolve() }),
          );
          return syncPromise;
        },
      },
    };
  }
};
