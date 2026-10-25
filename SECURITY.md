# Security Policy

## Supported version

The current development baseline is CAT Kitty Edition 1.0.0. The Firefox profile remains experimental until separately qualified.

## Reporting a vulnerability

Please do not publish exploitable details in a public issue before maintainers have had an opportunity to assess them. Open a private security advisory in GitHub if enabled for this repository, or contact the repository maintainers through the organization’s official channel.

## Security principles

- Keep permissions minimal and optional host access explicit.
- Validate downloaded filter sources before activation.
- Preserve the last known-good filter set on update failures.
- Do not log full browsing URLs by default.
- Never store license keys in the extension bundle.
- Do not modify third-party antivirus files, processes, or drivers.
