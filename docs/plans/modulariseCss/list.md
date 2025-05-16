# CSS File Renaming Plan

The following `.module.css` files in `src/styles` and subdirectories should be renamed to `.css` to restore global CSS behavior:

- src/styles/base/Buttons.module.css → src/styles/base/Buttons.css
- src/styles/base/Input.module.css → src/styles/base/Input.css
- src/styles/base/Utilities.module.css → src/styles/base/Utilities.css
- src/styles/contentarea/ContentArea.module.css → src/styles/contentarea/ContentArea.css
- src/styles/contentarea/CopyButton.module.css → src/styles/contentarea/CopyButton.css
- src/styles/contentarea/FileCard.module.css → src/styles/contentarea/FileCard.css
- src/styles/contentarea/FileList.module.css → src/styles/contentarea/FileList.css
- src/styles/contentarea/ProcessingIndicator.module.css → src/styles/contentarea/ProcessingIndicator.css
- src/styles/contentarea/SortDropDown.module.css → src/styles/contentarea/SortDropDown.css
- src/styles/contentarea/UserInstructions.module.css → src/styles/contentarea/UserInstructions.css
- src/styles/header/Header.module.css → src/styles/header/Header.css
- src/styles/header/ThemeToggle.module.css → src/styles/header/ThemeToggle.css
- src/styles/modals/CustomTaskTypeModal.module.css → src/styles/modals/CustomTaskTypeModal.css
- src/styles/modals/FilePreviewModal.module.css → src/styles/modals/FilePreviewModal.css
- src/styles/modals/IgnoreListModal.module.css → src/styles/modals/IgnoreListModal.css
- src/styles/modals/UpdateModal.module.css → src/styles/modals/UpdateModal.css
- src/styles/modals/WorkspaceManager.module.css → src/styles/modals/WorkspaceManager.css
- src/styles/sidebar/Searchbar.module.css → src/styles/sidebar/Searchbar.css
- src/styles/sidebar/Sidebar.module.css → src/styles/sidebar/Sidebar.css
- src/styles/sidebar/TaskTypeSelector.module.css → src/styles/sidebar/TaskTypeSelector.css
- src/styles/sidebar/TreeItem.module.css → src/styles/sidebar/TreeItem.css

After renaming, update all import statements in `src/main.tsx` to use the new `.css` filenames.
