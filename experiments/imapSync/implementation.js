/* exported imapSync */
const { getFolder } = ChromeUtils.importESModule("resource:///modules/ExtensionAccounts.sys.mjs");
const { MailServices } = ChromeUtils.importESModule("resource:///modules/MailServices.sys.mjs");

// Selecting a folder in the UI runs updateFolderWithListener (server headers -> local DB);
// the WebExtension API has no equivalent, so messages.list() reads 0 for a never-opened IMAP folder.
var imapSync = class extends ExtensionCommon.ExtensionAPI {
  getAPI() {
    return {
      imapSync: {
        /** @returns {Promise<boolean>} Whether the server sync completed successfully. */
        syncFolder(folderId) {
          const { folder } = getFolder(folderId);
          if (!(folder instanceof Ci.nsIMsgImapMailFolder)) return Promise.resolve(true); // local folders are always current
          /** @type {Promise<boolean>} */
          const syncPromise = new Promise((resolve) =>
            folder.updateFolderWithListener(null, {
              OnStartRunningUrl() {},
              OnStopRunningUrl(_url, status) { resolve(globalThis.Components.isSuccessCode(status)); },
            }),
          );
          return syncPromise;
        },
        /** @returns {Promise<void>} */
        async deleteFolder(folderId) {
          const { folder } = getFolder(folderId);
          if (folder instanceof Ci.nsIMsgImapMailFolder) {
            await new Promise((resolve, reject) => {
              MailServices.imap.deleteFolder(folder, {
                OnStartRunningUrl() {},
                OnStopRunningUrl(_url, status) {
                  if (globalThis.Components.isSuccessCode(status)) resolve();
                  else reject(status);
                },
              }, null);
            });
          }
          folder.parent.propagateDelete(folder, true);
        },
      },
    };
  }
};
