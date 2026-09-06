export const DEFAULT_OPTIONS = {
  baseFolderId: "",
  tag: "#todo_",
};

export async function getOptions(storageArea) {
  const { options } = await storageArea.get("options");
  return { ...DEFAULT_OPTIONS, ...options };
}
