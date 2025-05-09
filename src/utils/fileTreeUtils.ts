/**
 * Helper function to determine if a file should be excluded from selection
 * based on its properties and the includeBinaryPaths setting
 */
export const isFileExcluded = (fileData: any, includeBinaryPaths: boolean): boolean => {
  if (!fileData) return false;

  return (
    fileData.isSkipped || fileData.excludedByDefault || (fileData.isBinary && !includeBinaryPaths)
  );
};
