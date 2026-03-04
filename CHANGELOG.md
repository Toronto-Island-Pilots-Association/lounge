# Changelog

# Release - 2023-10-03

### Fixed
- **Reset Password Flow**: Corrected issues related to the reset password functionality, improving the user experience and reliability.
- **Workflows**: Fixed errors in the GitHub workflows, ensuring smoother automation of release processes and improved performance.

### Changed
- **Release-Notes Workflow**: Updated the workflow to enhance clarity in generating release notes and no longer pushes the changelog to the main branch. The CHANGELOG.md is now automatically updated on the development branch.
- **Release-PR Workflow**: Improved the GitHub Actions for creating release pull requests to ensure the changelog is updated on the development branch before merging to main.

# Release - 2023-10-03

### Fixed
- **Reset Password Flow**: Corrected issues related to the reset password functionality, improving the user experience and reliability.
- **Workflows**: Fixed errors in the GitHub workflows, ensuring smoother automation of release processes and improved performance.

### Changed
- **Release-Notes Workflow**: Updated the workflow to enhance clarity in generating release notes and no longer pushes the changelog to the main branch. The CHANGELOG.md is now automatically updated on the development branch.
- **Release-PR Workflow**: Improved the GitHub Actions for creating release pull requests to ensure efficient management of changelog entries and accurate integration of updates from the development branch. 

This release focuses on refining the password reset experience and enhancing the automation and efficiency of our workflow processes. Please review the changes and let us know if you encounter any issues!

### Added
- Implemented new test cases for the API endpoint `/api/members/search`.
- Introduced unit tests for the utility functions in the `lib/utils` module.
- Added unit tests for the email generation functionality in the `lib/resend` module.

### Changed
- Enhanced the design and layout of the discussions page to improve user experience.
- Updated the GitHub Actions workflow to create a pull request for CHANGELOG updates instead of pushing directly to the protected main branch.

### Fixed
- Resolved an issue with the release notes GitHub Action to ensure accurate generation of release notes.

### Testing
- Extensive unit tests have been added across various components to improve overall test coverage and reliability.

All notable changes to this project are documented here.

